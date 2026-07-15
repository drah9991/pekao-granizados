-- ==============================================================================
-- Migration: Unify Categories and Product Types Config
-- Description: Adds operational settings columns to the categories table,
--              migrates existing category rules from product_types_config,
--              and updates stock deduction functions to prioritize category configs.
-- ==============================================================================

-- 1. Add operational configuration columns to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS requires_recipe boolean DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sales_mode text DEFAULT 'unit' CHECK (sales_mode IN ('sizes', 'unit', 'weight'));
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS track_mixture_inventory boolean DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS inventory_unit text DEFAULT 'un';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS allow_toppings boolean DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS emoji_icon text DEFAULT '📦';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'bg-slate-500';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS alert_threshold integer DEFAULT 10;

-- 2. Populate operational parameters of existing categories based on their products
DO $$
DECLARE
    cat_rec RECORD;
    type_rec RECORD;
BEGIN
    FOR cat_rec IN SELECT id, name FROM public.categories
    LOOP
        -- Find the most common product type inside this category
        SELECT p.type INTO type_rec
        FROM public.products p
        WHERE p.category_id = cat_rec.id AND p.type IS NOT NULL
        GROUP BY p.type
        ORDER BY count(*) DESC
        LIMIT 1;

        IF type_rec.type IS NOT NULL THEN
            UPDATE public.categories cat
            SET 
                requires_recipe = pt.requires_recipe,
                sales_mode = pt.sales_mode,
                track_mixture_inventory = pt.track_mixture_inventory,
                inventory_unit = pt.inventory_unit,
                allow_toppings = pt.allow_toppings,
                emoji_icon = pt.emoji_icon,
                color_theme = pt.color_theme,
                tax_rate = COALESCE(pt.tax_rate, 0),
                alert_threshold = COALESCE(pt.alert_threshold, 10)
            FROM public.product_types_config pt
            WHERE cat.id = cat_rec.id AND pt.code = type_rec.type::text;
        ELSE
            -- Fallback default configurations
            IF cat_rec.name ILIKE '%granizado%' THEN
                UPDATE public.categories SET requires_recipe = true, sales_mode = 'sizes', track_mixture_inventory = true, inventory_unit = 'ml', allow_toppings = true, emoji_icon = '🍧', color_theme = 'bg-cyan-500' WHERE id = cat_rec.id;
            ELSIF cat_rec.name ILIKE '%topping%' THEN
                UPDATE public.categories SET requires_recipe = false, sales_mode = 'unit', track_mixture_inventory = false, inventory_unit = 'un', allow_toppings = false, emoji_icon = '🍒', color_theme = 'bg-rose-500' WHERE id = cat_rec.id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 3. Recreate process_sale with fallback mapping
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    new_sale_id uuid;
    v_idempotency_key text;
    v_store_id uuid;
    v_employee_id uuid;
    v_customer_id uuid;
    v_sale_subtotal numeric;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_deduction numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    v_idempotency_key := sale_data->>'idempotency_key';
    IF v_idempotency_key IS NOT NULL THEN
        SELECT id INTO new_sale_id FROM public.orders WHERE idempotency_key = v_idempotency_key;
        IF new_sale_id IS NOT NULL THEN
            RETURN new_sale_id;
        END IF;
    END IF;

    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount + v_delivery_fee);
    
    v_payment_method := (sale_data->'payment')::jsonb;
    v_cart_items := (sale_data->'items')::jsonb;
    
    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment, idempotency_key
    )
    VALUES (
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method, v_idempotency_key
    )
    RETURNING id INTO new_sale_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    ) ORDER BY product_id ASC NULLS LAST
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        IF v_item.product_id IS NOT NULL THEN
            -- Check category rules first, fallback to product_types_config
            SELECT COALESCE(cat.track_mixture_inventory, pt.track_mixture_inventory, false)
              INTO v_is_tracked_mixture
              FROM public.products p
                LEFT JOIN public.categories cat ON p.category_id = cat.id
                LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
             WHERE p.id = v_item.product_id;

            SELECT COALESCE(base_volume, 4)
              INTO v_base_vol
              FROM public.products
             WHERE id = v_item.product_id;

            SELECT qty INTO v_current_stock 
              FROM public.store_stock 
             WHERE product_id = v_item.product_id AND store_id = v_store_id 
               FOR UPDATE;

            UPDATE public.store_stock 
               SET qty = qty - v_item.quantity, 
                   updated_at = NOW()
             WHERE product_id = v_item.product_id AND store_id = v_store_id;

            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
            VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

            IF v_is_tracked_mixture THEN
                FOR recipe_row IN 
                    SELECT r.inventory_item_id, r.quantity_required, ii.unit
                    FROM public.recipes r
                    JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                    WHERE r.product_id = v_item.product_id
                    ORDER BY r.inventory_item_id ASC
                LOOP
                    SELECT stock INTO v_current_stock
                    FROM public.inventory_items
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                    FOR UPDATE;

                    IF v_current_stock IS NOT NULL THEN
                        IF recipe_row.unit = 'ml' THEN
                            v_deduction := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                        ELSE
                            v_deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                        END IF;

                        UPDATE public.inventory_items 
                           SET stock = stock - v_deduction, 
                               updated_at = NOW()
                         WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                    END IF;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    RETURN new_sale_id;
END;
$$;

-- 4. Recreate update_order_with_stock with fallback mapping
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id ORDER BY product_id ASC NULLS LAST
    LOOP
        IF v_item.product_id IS NOT NULL THEN
            SELECT COALESCE(cat.track_mixture_inventory, pt.track_mixture_inventory, false)
              INTO v_is_tracked_mixture
              FROM public.products p 
                LEFT JOIN public.categories cat ON p.category_id = cat.id
                LEFT JOIN public.product_types_config pt ON p.type::text = pt.code 
             WHERE p.id = v_item.product_id;

            SELECT COALESCE(base_volume, 4) 
              INTO v_base_vol
              FROM public.products
             WHERE id = v_item.product_id;

            UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
            WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

            IF v_is_tracked_mixture THEN
                FOR recipe_row IN 
                    SELECT r.inventory_item_id, r.quantity_required, ii.unit 
                    FROM public.recipes r
                    JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                    WHERE r.product_id = v_item.product_id
                    ORDER BY r.inventory_item_id ASC
                LOOP
                    SELECT stock INTO v_current_stock
                    FROM public.inventory_items
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                    FOR UPDATE;

                    IF recipe_row.unit = 'ml' THEN
                        v_val := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.qty;
                    ELSE
                        v_val := recipe_row.quantity_required * v_item.qty * COALESCE(v_item.size_multiplier, 1);
                    END IF;

                    UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    ) ORDER BY product_id ASC NULLS LAST
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        IF v_item.product_id IS NOT NULL THEN
            SELECT COALESCE(cat.track_mixture_inventory, pt.track_mixture_inventory, false)
              INTO v_is_tracked_mixture
              FROM public.products p 
                LEFT JOIN public.categories cat ON p.category_id = cat.id
                LEFT JOIN public.product_types_config pt ON p.type::text = pt.code 
             WHERE p.id = v_item.product_id;

            SELECT COALESCE(base_volume, 4) 
              INTO v_base_vol
              FROM public.products
             WHERE id = v_item.product_id;

            UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
            WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

            IF v_is_tracked_mixture THEN
                FOR recipe_row IN 
                    SELECT r.inventory_item_id, r.quantity_required, ii.unit 
                    FROM public.recipes r
                    JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                    WHERE r.product_id = v_item.product_id
                    ORDER BY r.inventory_item_id ASC
                LOOP
                    SELECT stock INTO v_current_stock
                    FROM public.inventory_items
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
                    FOR UPDATE;

                    IF recipe_row.unit = 'ml' THEN
                        v_val := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                    ELSE
                        v_val := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                    END IF;

                    UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;

-- 5. Recreate cancel_sale_with_stock_restore with fallback mapping
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
    v_current_stock numeric;
    v_base_vol numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulación es obligatorio.';
    END IF;

    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY product_id ASC NULLS LAST
    LOOP
        IF item_row.product_id IS NOT NULL THEN
            SELECT COALESCE(cat.track_mixture_inventory, pt.track_mixture_inventory, false)
              INTO v_is_tracked_mixture
              FROM public.products p 
                LEFT JOIN public.categories cat ON p.category_id = cat.id
                LEFT JOIN public.product_types_config pt ON p.type::text = pt.code 
             WHERE p.id = item_row.product_id;

            SELECT COALESCE(base_volume, 4) 
              INTO v_base_vol
              FROM public.products
             WHERE id = item_row.product_id;

            UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
            WHERE product_id = item_row.product_id AND store_id = v_store_id;

            IF v_is_tracked_mixture THEN
                FOR recipe_row IN 
                    SELECT r.inventory_item_id, r.quantity_required, ii.unit 
                    FROM public.recipes r
                    JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                    WHERE r.product_id = item_row.product_id
                    ORDER BY r.inventory_item_id ASC
                LOOP
                    SELECT stock INTO v_current_stock
                    FROM public.inventory_items
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
                    FOR UPDATE;

                    IF recipe_row.unit = 'ml' THEN
                        v_val := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                    ELSE
                        v_val := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                    END IF;

                    UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END LOOP;
            END IF;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;
