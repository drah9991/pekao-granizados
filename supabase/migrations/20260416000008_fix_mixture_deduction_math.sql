-- ==============================================================================
-- Migration: Sync Mixture Deduction Math 
-- Description: Asegura que si la unidad de la receta es 'ml' y es un granizado,
--              el backend multiplique la cantidad por el base_volumen del vaso
--              y por la conversión (29.57) en vez de restar solo "1".
-- ==============================================================================

-- 1. Actualizar process_sale
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_sale_id uuid;
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
    current_stock numeric;
    deduction numeric;
    v_base_vol numeric;
BEGIN
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
    
    BEGIN
        IF sale_data->>'customer_id' IS NOT NULL THEN
            v_customer_id := (sale_data->>'customer_id')::uuid;
        ELSE
            v_customer_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_customer_id := NULL;
    END;

    IF v_store_id IS NULL OR v_employee_id IS NULL OR v_cart_items IS NULL THEN
        RAISE EXCEPTION 'Missing required fields: store_id, employee_id, or items';
    END IF;

    -- Create Order
    INSERT INTO public.orders (
        store_id, customer_id, created_by, total, subtotal, tax, tip_amount, 
        delivery_fee, order_type, delivery_address, delivery_phone,
        status, payment
    )
    VALUES (
        v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        <<item_processing>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            -- Obtener base_volume del producto
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = v_item.product_id;

            -- Determinar si el producto usa tanque
            SELECT COALESCE(pt.track_mixture_inventory, false)
              INTO is_tracked_mixture
              FROM public.products p
              LEFT JOIN public.product_types_config pt ON p.type::text = pt.code
             WHERE p.id = v_item.product_id;
            
            IF is_tracked_mixture IS NULL THEN
                SELECT CASE WHEN type::text = 'granizado' OR category = 'Granizado' THEN true ELSE false END 
                  INTO is_tracked_mixture
                  FROM public.products WHERE id = v_item.product_id;
            END IF;

            -- 1. Deduct from store_stock ONLY IF it's NOT a mixture
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
                WHERE product_id = v_item.product_id AND store_id = v_store_id;

                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
                VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);
            END IF;

            -- 2. Deduct from inventory_items (Recipes)
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure 
                FROM public.recipes r
                JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
                WHERE r.product_id = v_item.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    -- Sinergia Matemática: Multiplicamos la base (oz) por el vaso (multiplier) y pasamos a ML (29.57)
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(v_item.size_multiplier, 1) * 29.57 * v_item.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);
                END IF;

                SELECT stock INTO current_stock FROM public.inventory_items WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id FOR UPDATE;

                IF current_stock IS NOT NULL THEN
                    UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
                    WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
                END IF;
            END LOOP;
        END item_processing;
    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status public.order_status;
    v_tip_amount numeric;
    v_delivery_fee numeric;
    v_order_type text;
    v_delivery_address text;
    v_delivery_phone text;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb;
    v_old_store_id uuid;
    v_employee_id uuid;
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
    v_base_vol numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status')::public.order_status;
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((order_update_data->>'delivery_fee')::numeric, 0);
    v_order_type := COALESCE(order_update_data->>'order_type', 'pickup');
    v_delivery_address := order_update_data->>'delivery_address';
    v_delivery_phone := order_update_data->>'delivery_phone';
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount + v_delivery_fee);
    v_items := (order_update_data->'items');
    
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- =====================================
    -- Restore Stock from Old Items
    -- =====================================
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        <<item_restore>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'entry', item_row.qty, 'Corrección Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    restoration := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_restore;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;
    UPDATE public.orders SET customer_id = v_customer_id, status = v_status, tip_amount = v_tip_amount, delivery_fee = v_delivery_fee, order_type = v_order_type, delivery_address = v_delivery_address, delivery_phone = v_delivery_phone, subtotal = v_subtotal, total = v_total, updated_at = NOW() WHERE id = v_order_id;

    -- =====================================
    -- Apply New Items and Deduct Stock
    -- =====================================
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric)
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier) VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0, item_row.size, item_row.size_multiplier);

        <<item_deduct>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;
            
            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty - item_row.quantity, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_old_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_old_store_id, 'exit', item_row.quantity, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    deduction := recipe_row.quantity_required * v_base_vol * COALESCE(item_row.size_multiplier, 1) * 29.57 * item_row.quantity;
                ELSE
                    deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
                END IF;
                UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END item_deduct;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(
    p_order_id uuid,
    p_reason   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id   uuid;
    v_employee_id uuid;
    v_status     text;
    item_row     record;
    recipe_row   record;
    restoration  numeric;
    v_base_vol   numeric;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'No tienes permisos para anular ventas. Se requiere rol admin o manager.';
    END IF;
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'El motivo de anulación es obligatorio.';
    END IF;

    SELECT store_id, created_by, status INTO v_store_id, v_employee_id, v_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venta no encontrada: %', p_order_id; END IF;
    IF v_status::text = 'cancelled' THEN RAISE EXCEPTION 'Esta venta ya fue anulada anteriormente.'; END IF;

    FOR item_row IN SELECT oi.product_id, oi.qty, oi.name, COALESCE(oi.size_multiplier, 1) AS size_multiplier FROM public.order_items oi WHERE oi.order_id = p_order_id
    LOOP
        <<item_restore_cancel>>
        DECLARE
            is_tracked_mixture boolean;
        BEGIN
            SELECT COALESCE(base_volume, 4) INTO v_base_vol FROM public.products WHERE id = item_row.product_id;
            SELECT COALESCE(pt.track_mixture_inventory, false) INTO is_tracked_mixture FROM public.products p LEFT JOIN public.product_types_config pt ON p.type::text = pt.code WHERE p.id = item_row.product_id;

            IF NOT COALESCE(is_tracked_mixture, false) THEN
                UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW() WHERE product_id = item_row.product_id AND store_id = v_store_id;
                INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) VALUES (item_row.product_id, v_store_id, 'entry', item_row.qty, 'ANULACIÓN #' || substring(p_order_id::text from 1 for 8) || ' — ' || item_row.name || ' | Motivo: ' || trim(p_reason), auth.uid());
            END IF;

            FOR recipe_row IN SELECT r.inventory_item_id, r.quantity_required, ii.unit_of_measure FROM public.recipes r JOIN public.inventory_items ii ON r.inventory_item_id = ii.id WHERE r.product_id = item_row.product_id
            LOOP
                IF recipe_row.unit_of_measure = 'ml' AND is_tracked_mixture THEN
                    restoration := recipe_row.quantity_required * v_base_vol * item_row.size_multiplier * 29.57 * item_row.qty;
                ELSE
                    restoration := recipe_row.quantity_required * item_row.qty * item_row.size_multiplier;
                END IF;
                UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW() WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END item_restore_cancel;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled'::public.order_status, cancellation_reason = trim(p_reason), cancelled_by = auth.uid(), cancelled_at = NOW(), updated_at = NOW() WHERE id = p_order_id;
END;
$$;
