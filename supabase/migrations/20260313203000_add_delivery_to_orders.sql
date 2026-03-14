-- Migration to add Delivery (Domicilio) concept to Orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'pickup' CHECK (order_type IN ('pickup', 'delivery')),
ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS delivery_phone text;

-- Update process_sale RPC to handle delivery fields
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
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_order_type := COALESCE(sale_data->>'order_type', 'pickup');
    v_delivery_address := sale_data->>'delivery_address';
    v_delivery_phone := sale_data->>'delivery_phone';
    
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_delivery_fee := COALESCE((sale_data->>'delivery_fee')::numeric, 0);
    
    -- total can be provided or calculated
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
        product_id uuid,
        quantity numeric,
        price numeric,
        name text,
        size text,
        size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (
            new_sale_id,
            v_item.product_id,
            v_item.name,
            v_item.quantity,
            v_item.price,
            0
        );

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes 
            WHERE product_id = v_item.product_id
        LOOP
            deduction := recipe_row.quantity_required * v_item.quantity * COALESCE(v_item.size_multiplier, 1);

            SELECT stock INTO current_stock
            FROM public.inventory_items
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id
            FOR UPDATE;

            IF current_stock IS NULL THEN
                 RAISE EXCEPTION 'Inventory item % not found in store %', recipe_row.inventory_item_id, v_store_id;
            END IF;

            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

            INSERT INTO public.movements (
                product_id, store_id, type, qty, reason, user_id
            ) VALUES (
                v_item.product_id, v_store_id, 'exit', deduction,
                'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                v_employee_id
            );
        END LOOP;
    END LOOP;

    RETURN new_sale_id;
END;
$$;

-- Update update_order_with_stock RPC to handle delivery fields
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

    SELECT store_id, created_by INTO v_old_store_id, v_employee_id
    FROM public.orders WHERE id = v_order_id FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

    -- Restore Stock
    FOR item_row IN SELECT * FROM public.order_items WHERE order_id = v_order_id
    LOOP
        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes WHERE product_id = item_row.product_id
        LOOP
            restoration := recipe_row.quantity_required * item_row.qty;
            UPDATE public.inventory_items SET stock = stock + restoration, updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;
            
            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id) 
            VALUES (item_row.product_id, v_old_store_id, 'entry', restoration, 'Corrección Pedido #' || substring(v_order_id::text from 1 for 8), auth.uid());
        END LOOP;
    END LOOP;

    DELETE FROM public.order_items WHERE order_id = v_order_id;

    -- Update Order
    UPDATE public.orders
    SET 
        customer_id = v_customer_id,
        status = v_status,
        tip_amount = v_tip_amount,
        delivery_fee = v_delivery_fee,
        order_type = v_order_type,
        delivery_address = v_delivery_address,
        delivery_phone = v_delivery_phone,
        subtotal = v_subtotal,
        total = v_total,
        updated_at = NOW()
    WHERE id = v_order_id;

    -- Apply New Items and Deduct Stock
    FOR item_row IN SELECT * FROM jsonb_to_recordset(v_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size_multiplier numeric
    )
    LOOP
        INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
        VALUES (v_order_id, item_row.product_id, item_row.name, item_row.quantity, item_row.price, 0);

        FOR recipe_row IN 
            SELECT inventory_item_id, quantity_required 
            FROM public.recipes WHERE product_id = item_row.product_id
        LOOP
            deduction := recipe_row.quantity_required * item_row.quantity * COALESCE(item_row.size_multiplier, 1);
            UPDATE public.inventory_items SET stock = stock - deduction, updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_old_store_id;

            INSERT INTO public.movements (product_id, store_id, type, qty, reason, user_id)
            VALUES (item_row.product_id, v_old_store_id, 'exit', deduction, 'Venta Corregida #' || substring(v_order_id::text from 1 for 8), auth.uid());
        END LOOP;
    END LOOP;

    RETURN v_order_id;
END;
$$;
