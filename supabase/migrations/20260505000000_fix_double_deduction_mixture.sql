-- =====================================================================
-- Migration: Fix Double Deduction Mixture
-- Description: Elimina la multiplicación por size_multiplier en el cálculo
--              de deducción de recetas, ya que las preparaciones (ej. bases
--              de 10oz) ya tienen definida la cantidad exacta a descontar.
-- =====================================================================

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
    v_is_tracked_mixture boolean;
    v_deduction numeric;
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
        v_store_id, (sale_data->>'customer_id')::uuid, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 
        v_delivery_fee, v_order_type, v_delivery_address, v_delivery_phone,
        'completed', v_payment_method
    )
    RETURNING id INTO new_sale_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        -- Insert order item
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (new_sale_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        -- Obtener parametrización del producto
        SELECT COALESCE(pt.track_mixture_inventory, false)
          INTO v_is_tracked_mixture
          FROM public.products p
          LEFT JOIN public.product_types_config pt ON p.type = pt.code
         WHERE p.id = v_item.product_id;

        -- 1. Deducción de PRODUCTO (Stock de Unidades / store_stock)
        UPDATE public.store_stock 
           SET qty = qty - v_item.quantity, 
               updated_at = NOW()
         WHERE product_id = v_item.product_id AND store_id = v_store_id;

        INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
        VALUES (v_item.product_id, v_store_id, 'exit', v_item.quantity, 'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name, v_employee_id);

        -- 2. Deducción de MEZCLA (Medición de Tanques / inventory_items)
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN 
                SELECT r.inventory_item_id, r.quantity_required
                FROM public.recipes r
                WHERE r.product_id = v_item.product_id
            LOOP
                -- FIX: Se eliminó * COALESCE(v_item.size_multiplier, 1) para evitar cobro doble
                v_deduction := recipe_row.quantity_required * v_item.quantity;

                UPDATE public.inventory_items 
                   SET stock = stock - v_deduction, 
                       updated_at = NOW()
                 WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;

    END LOOP;

    RETURN new_sale_id;
END;
$$;


-- 2. Actualizar update_order_with_stock (Misma lógica simétrica)
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_old_store_id uuid;
    v_item record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
BEGIN
    v_order_id := (order_update_data->>'order_id')::uuid;
    
    SELECT store_id INTO v_old_store_id FROM public.orders WHERE id = v_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restaurar Stock de items viejos
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type = pt.code WHERE p.id = v_item.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + v_item.qty, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                -- FIX: Se eliminó * COALESCE(v_item.size_multiplier, 1)
                v_val := recipe_row.quantity_required * v_item.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Actualizar cabecera (Status, total, etc.)
    UPDATE public.orders
    SET status = (order_update_data->>'status')::public.order_status,
        total = (order_update_data->>'total')::numeric,
        subtotal = (order_update_data->>'subtotal')::numeric,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Aplicar Nuevos items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(order_update_data->'items') AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax, size, size_multiplier)
        VALUES (v_order_id, v_item.product_id, v_item.name, v_item.quantity, v_item.price, 0, v_item.size, v_item.size_multiplier);

        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type = pt.code WHERE p.id = v_item.product_id;

        -- Descontar Unidades
        UPDATE public.store_stock SET qty = qty - v_item.quantity, updated_at = NOW()
        WHERE product_id = v_item.product_id AND store_id = v_old_store_id;

        -- Descontar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = v_item.product_id
            LOOP
                -- FIX: Se eliminó * COALESCE(v_item.size_multiplier, 1)
                v_val := recipe_row.quantity_required * v_item.quantity;
                UPDATE public.inventory_items SET stock = stock - v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            END LOOP;
        END IF;
    END LOOP;

    RETURN v_order_id;
END;
$$;


-- 3. Actualizar cancel_sale_with_stock_restore
CREATE OR REPLACE FUNCTION public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id uuid;
    item_row record;
    recipe_row record;
    v_is_tracked_mixture boolean;
    v_val numeric;
BEGIN
    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT COALESCE(pt.track_mixture_inventory, false) INTO v_is_tracked_mixture
        FROM public.products p LEFT JOIN public.product_types_config pt ON p.type = pt.code WHERE p.id = item_row.product_id;

        -- Restaurar Unidades
        UPDATE public.store_stock SET qty = qty + item_row.qty, updated_at = NOW()
        WHERE product_id = item_row.product_id AND store_id = v_store_id;

        -- Restaurar Mezcla
        IF v_is_tracked_mixture THEN
            FOR recipe_row IN SELECT inventory_item_id, quantity_required FROM public.recipes WHERE product_id = item_row.product_id
            LOOP
                -- FIX: Se eliminó * COALESCE(item_row.size_multiplier, 1)
                v_val := recipe_row.quantity_required * item_row.qty;
                UPDATE public.inventory_items SET stock = stock + v_val, updated_at = NOW()
                WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;
            END LOOP;
        END IF;
    END LOOP;

    UPDATE public.orders SET status = 'cancelled', cancellation_reason = p_reason, updated_at = NOW() WHERE id = p_order_id;
END;
$$;
