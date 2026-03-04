-- RPC function to process sales with automatic stock adjustment and movement tracking
CREATE OR REPLACE FUNCTION public.process_sale_with_stock(
  p_store_id UUID,
  p_user_id UUID,
  p_subtotal NUMERIC,
  p_tax NUMERIC,
  p_total NUMERIC,
  p_payment JSONB,
  p_items JSONB -- Expected: Array of {product_id: UUID, name: text, qty: numeric, price: numeric, tax: numeric}
) RETURNS UUID AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- 1. Insert Order
  INSERT INTO public.orders (
    store_id, 
    created_by, 
    subtotal, 
    tax, 
    total, 
    status, 
    payment
  ) VALUES (
    p_store_id, 
    p_user_id, 
    p_subtotal, 
    p_tax, 
    p_total, 
    'completed', 
    p_payment
  ) RETURNING id INTO v_order_id;

  -- 2. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert into order_items
    INSERT INTO public.order_items (
      order_id, 
      product_id, 
      name, 
      qty, 
      price, 
      tax
    ) VALUES (
      v_order_id, 
      (v_item->>'product_id')::UUID, 
      v_item->>'name', 
      (v_item->>'qty')::NUMERIC, 
      (v_item->>'price')::NUMERIC, 
      (v_item->>'tax')::NUMERIC
    );

    -- Discount stock if product_id is provided
    IF (v_item->>'product_id') IS NOT NULL THEN
      -- Atomic update to decrease stock
      UPDATE public.store_stock
      SET qty = qty - (v_item->>'qty')::NUMERIC,
          updated_at = now()
      WHERE store_id = p_store_id AND product_id = (v_item->>'product_id')::UUID;

      -- Record inventory movement
      INSERT INTO public.movements (
        product_id, 
        store_id, 
        qty, 
        type, 
        reason, 
        user_id
      ) VALUES (
        (v_item->>'product_id')::UUID, 
        p_store_id, 
        -(v_item->>'qty')::NUMERIC, 
        'exit', 
        'Venta POS (Pedido #' || v_order_id || ')', 
        p_user_id
      );
    END IF;
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.process_sale_with_stock(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_sale_with_stock(UUID, UUID, NUMERIC, NUMERIC, NUMERIC, JSONB, JSONB) TO service_role;
