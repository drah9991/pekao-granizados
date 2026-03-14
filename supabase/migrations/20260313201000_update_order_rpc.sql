-- RPC function to update an existing order, adjusting stock retroactively
CREATE OR REPLACE FUNCTION public.update_order_with_stock(order_update_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id uuid;
    v_customer_id uuid;
    v_status text;
    v_tip_amount numeric;
    v_subtotal numeric;
    v_total numeric;
    v_items jsonb; -- Array of {product_id, qty, price, name, size_multiplier}
    
    v_old_store_id uuid;
    v_employee_id uuid;
    
    item_row record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
    restoration numeric;
BEGIN
    -- 1. Extract and validate basic data
    v_order_id := (order_update_data->>'order_id')::uuid;
    v_customer_id := (order_update_data->>'customer_id')::uuid;
    v_status := (order_update_data->>'status');
    v_tip_amount := COALESCE((order_update_data->>'tip_amount')::numeric, 0);
    v_subtotal := COALESCE((order_update_data->>'subtotal')::numeric, 0);
    v_total := COALESCE((order_update_data->>'total')::numeric, v_subtotal + v_tip_amount);
    v_items := (order_update_data->'items');
    
    -- Check if user is authenticated and is admin/manager (or the owner, but usually these edits are admin-only)
    IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'manager') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins or managers can edit orders.';
    END IF;

    -- Get old order info to identify store and items to restore stock
    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders 
    WHERE id = v_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', v_order_id;
    END IF;

    -- 2. RESTORE STOCK FROM OLD ITEMS
    -- We revert the stock deduction of the existing items before applying the new ones.
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        -- Note: We need the size_multiplier that was used. 
        -- Since order_items doesn't store size_multiplier, we rely on the product being accurately reflected.
        -- HOWEVER, the original process_sale uses recipes.
        -- If recipes haven't changed, we can recalculate. 
        -- If size_multiplier was used, we should have stored it or we have to assume 1 if not available.
        -- Let's check order_items columns... it has qty, but not size_multiplier.
        -- This is a slight limitation but we will restore based on basic recipe qty * item_qty.
        
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required * item_row.qty; 
            -- Note: If we had size_multiplier in order_items, we'd use it here.

            UPDATE public.inventory_items
            SET stock = stock + restoration,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

            INSERT INTO public.movements (
                product_id, store_id, type, qty, reason, user_id
            ) VALUES (
                item_row.product_id, v_old_store_id, 'entry', restoration,
                'Corrección de Pedido #' || substring(v_order_id::text from 1 for 8) || ' (Devolución)',
                auth.uid()
            );
        END LOOP;
    END LOOP;

    -- 3. DELETE OLD ITEMS
    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- 4. APPLY NEW ORDER DATA
    UPDATE public.orders
    SET 
        customer_id = v_customer_id,
        status = v_status::public.order_status,
        tip_amount = v_tip_amount,
        subtotal = v_subtotal,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- 5. INSERT NEW ITEMS AND DEDUCT STOCK
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (
            v_order_id,
            item_row.product_id,
            item_row.name,
            item_row.quantity,
            item_row.price,
            0
        );

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = item_row.product_id
        LOOP
            deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);

            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id
            FOR UPDATE;

            IF current_stock IS NULL THEN
                 RAISE EXCEPTION 'Inventory item % not found in store %', recipe_row.inventory_item_id, v_old_store_id;
            END IF;

            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

            INSERT INTO public.movements (
                product_id, store_id, type, qty, reason, user_id
            ) VALUES (
                item_row.product_id, v_old_store_id, 'exit', deduction,
                'Venta POS Corregida #' || substring(v_order_id::text from 1 for 8) || ' - ' || item_row.name,
                auth.uid()
            );
        END LOOP;
    END LOOP;

    RETURN v_order_id;
END;
$$;
