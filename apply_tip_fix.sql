ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0;

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
    v_sale_total numeric;
    v_payment_method jsonb;
    v_cart_items jsonb;
    v_item record;
    recipe_row record;
    current_stock numeric;
    deduction numeric;
BEGIN
    v_store_id := (sale_data->>'store_id')::uuid;
    v_employee_id := (sale_data->>'employee_id')::uuid;
    v_sale_subtotal := COALESCE((sale_data->>'subtotal')::numeric, 0);
    v_tip_amount := COALESCE((sale_data->>'tip_amount')::numeric, 0);
    v_sale_total := COALESCE((sale_data->>'total')::numeric, v_sale_subtotal + v_tip_amount);
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

    INSERT INTO public.orders (store_id, customer_id, created_by, total, subtotal, tax, tip_amount, status, payment)
    VALUES (v_store_id, v_customer_id, v_employee_id, v_sale_total, v_sale_subtotal, 0, v_tip_amount, 'completed', v_payment_method)
    RETURNING id INTO new_sale_id;

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

            IF current_stock < deduction THEN
                RAISE EXCEPTION 'Stock insuficiente para insumo %. Disponible: %, Querido: %', 
                                recipe_row.inventory_item_id, current_stock, deduction;
            END IF;

            UPDATE public.inventory_items
            SET stock = stock - deduction,
                updated_at = NOW()
            WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

            INSERT INTO public.movements (
                product_id,
                store_id,
                type,
                qty,
                reason,
                user_id
            ) VALUES (
                v_item.product_id,
                v_store_id,
                'exit',
                deduction,
                'Venta POS #' || substring(new_sale_id::text from 1 for 8) || ' - ' || v_item.name,
                v_employee_id
            );

        END LOOP;
        
    END LOOP;

    RETURN new_sale_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
