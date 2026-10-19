-- =============================================================================
-- Checkout de la app móvil: RPC create_mobile_order
--
-- - El cliente solo envía productos y cantidades; los precios y el total se
--   recalculan aquí desde `products`. Nunca se confía en precios del celular.
-- - Solo se venden productos activos, públicos, que no sean toppings y que
--   pertenezcan a la sede del pedido (o sean globales).
-- - El pedido queda 'pending' y NO descuenta inventario: eso ocurre cuando el
--   personal lo completa. `payment.channel = 'mobile_app'` lo identifica.
-- - Si hay sesión de cliente, el pedido se liga a su fila de `customers`.
-- - `p_idempotency_key` evita pedidos duplicados si la app reintenta: la misma
--   clave devuelve el pedido ya creado.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_mobile_order(
  p_store_id uuid,
  p_items jsonb,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_lines constant int := 30;
  c_max_qty constant int := 20;
  v_key text := btrim(p_idempotency_key);
  v_customer_id uuid;
  v_order_id uuid;
  v_existing record;
  v_line record;
  v_subtotal numeric := 0;
  v_line_count int;
BEGIN
  -- Validación de entrada -----------------------------------------------------
  IF v_key IS NULL OR char_length(v_key) NOT BETWEEN 16 AND 100 THEN
    RAISE EXCEPTION 'Clave de pedido inválida' USING ERRCODE = '22023';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'El pedido no tiene productos' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p_store_id) THEN
    RAISE EXCEPTION 'La sede no existe' USING ERRCODE = '22023';
  END IF;

  -- Reintento: la misma clave devuelve el mismo pedido --------------------------
  PERFORM pg_advisory_xact_lock(hashtext('create_mobile_order:' || v_key));
  SELECT o.id, o.total, o.status::text AS status, o.created_at INTO v_existing
  FROM public.orders o
  WHERE o.idempotency_key = v_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id', v_existing.id,
      'total', v_existing.total,
      'status', v_existing.status,
      'created_at', v_existing.created_at,
      'is_duplicate', true
    );
  END IF;

  -- Líneas: agrupar por producto y validar cantidades ---------------------------
  DROP TABLE IF EXISTS _mobile_order_lines;
  CREATE TEMP TABLE _mobile_order_lines ON COMMIT DROP AS
  SELECT (item->>'product_id')::uuid AS product_id, sum((item->>'qty')::int) AS qty
  FROM jsonb_array_elements(p_items) AS item
  GROUP BY 1;

  SELECT count(*) INTO v_line_count FROM _mobile_order_lines;
  IF v_line_count = 0 OR v_line_count > c_max_lines THEN
    RAISE EXCEPTION 'El pedido debe tener entre 1 y % productos', c_max_lines USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM _mobile_order_lines WHERE product_id IS NULL OR qty IS NULL OR qty < 1 OR qty > c_max_qty) THEN
    RAISE EXCEPTION 'Cada producto debe tener entre 1 y % unidades', c_max_qty USING ERRCODE = '22023';
  END IF;

  -- Precios desde la base, solo productos vendibles en esta sede ----------------
  IF EXISTS (
    SELECT 1
    FROM _mobile_order_lines l
    LEFT JOIN public.products p
      ON p.id = l.product_id
     AND p.active = true
     AND p.is_public = true
     AND p.type <> 'topping'
     AND (p.store_id = p_store_id OR p.store_id IS NULL)
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Algún producto ya no está disponible. Actualiza el menú e inténtalo de nuevo.' USING ERRCODE = 'P0001';
  END IF;

  SELECT sum(p.price * l.qty) INTO v_subtotal
  FROM _mobile_order_lines l
  JOIN public.products p ON p.id = l.product_id;

  -- Cliente con sesión (el personal no tiene ficha de cliente) ------------------
  IF auth.uid() IS NOT NULL THEN
    SELECT c.id INTO v_customer_id FROM public.customers c WHERE c.profile_id = auth.uid();
  END IF;

  -- Pedido ----------------------------------------------------------------------
  INSERT INTO public.orders (
    store_id, customer_id, subtotal, tax, total, status, order_type, payment, idempotency_key
  ) VALUES (
    p_store_id, v_customer_id, v_subtotal, 0, v_subtotal, 'pending', 'pickup',
    jsonb_build_object('channel', 'mobile_app', 'method', 'pay_at_store'),
    v_key
  )
  RETURNING id INTO v_order_id;

  FOR v_line IN
    SELECT p.id, p.name, p.price, l.qty
    FROM _mobile_order_lines l
    JOIN public.products p ON p.id = l.product_id
    ORDER BY p.name
  LOOP
    -- order_items.subtotal es una columna generada (qty * price).
    INSERT INTO public.order_items (order_id, product_id, name, qty, price, tax)
    VALUES (v_order_id, v_line.id, v_line.name, v_line.qty, v_line.price, 0);
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total', v_subtotal,
    'status', 'pending',
    'created_at', now(),
    'is_duplicate', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_mobile_order(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_mobile_order(uuid, jsonb, text) TO anon, authenticated;
