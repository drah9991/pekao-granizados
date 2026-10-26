-- =============================================================================
-- process_sale: lock por idempotency_key.
--
-- process_sale_unchecked busca la clave y luego inserta, sin lock: dos envíos
-- simultáneos de la misma venta pasaban la búsqueda y el segundo fallaba con
-- 23505. No duplicaba, pero el POS mostraba un error falso. Un advisory lock
-- por transacción sobre la clave los serializa.
-- Mismo cuerpo que 20261026000100_guard_process_sale.sql más el lock; mismos
-- permisos (CREATE OR REPLACE los conserva).
-- =============================================================================

-- Dos envíos simultáneos con la misma clave (doble pestaña, SW + página) se
-- serializan: el segundo espera a que termine la transacción del primero y
-- process_sale_unchecked encuentra la venta ya creada en vez de chocar con el
-- UNIQUE (23505). El lock es por transacción (una llamada RPC de PostgREST).
CREATE OR REPLACE FUNCTION public.process_sale_lock_idempotency_key(sale_data jsonb)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $lock$
BEGIN
  IF nullif(sale_data->>'idempotency_key', '') IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('process_sale:' || (sale_data->>'idempotency_key'), 0));
  END IF;
END;
$lock$;

REVOKE ALL ON FUNCTION public.process_sale_lock_idempotency_key(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_store_id uuid := (sale_data->>'store_id')::uuid;
  v_employee_id uuid := (sale_data->>'employee_id')::uuid;
  v_is_superadmin boolean;
  v_own_store_id uuid;
  v_is_staff boolean;
  v_is_admin boolean;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    PERFORM public.process_sale_lock_idempotency_key(sale_data);
    RETURN public.process_sale_unchecked(sale_data);
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión requerida para registrar ventas' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(p.is_superadmin, false), p.store_id
    INTO v_is_superadmin, v_own_store_id
  FROM public.profiles p
  WHERE p.id = v_uid;

  v_is_superadmin := coalesce(v_is_superadmin, false)
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role::text = 'super_admin');
  -- Roles que entran al POS (ProtectedRoute de /pos), no cualquier fila de user_roles:
  -- en producción existen también 'driver' y 'prueba_cliente'.
  v_is_staff := v_is_superadmin OR EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = v_uid AND r.role::text IN ('admin', 'manager', 'store_manager', 'cashier', 'super_admin')
  );
  v_is_admin := v_is_superadmin
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role::text = 'admin');

  IF NOT v_is_staff THEN
    RAISE EXCEPTION 'Solo el personal de Pekao puede registrar ventas' USING ERRCODE = '42501';
  END IF;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'La venta no indica la sede' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_is_admin AND v_store_id IS DISTINCT FROM v_own_store_id THEN
    RAISE EXCEPTION 'No puedes registrar ventas en esta sede' USING ERRCODE = '42501';
  END IF;

  IF v_employee_id IS DISTINCT FROM v_uid AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_employee_id
      AND (
        coalesce(p.is_superadmin, false)
        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role::text IN ('admin', 'super_admin'))
        OR (p.store_id = v_store_id AND EXISTS (
          SELECT 1 FROM public.user_roles r
          WHERE r.user_id = p.id AND r.role::text IN ('admin', 'manager', 'store_manager', 'cashier', 'super_admin')
        ))
      )
  ) THEN
    RAISE EXCEPTION 'El empleado de la venta no pertenece a esta sede' USING ERRCODE = '42501';
  END IF;

  -- El lock se toma después de validar: quien no puede vender no bloquea claves.
  PERFORM public.process_sale_lock_idempotency_key(sale_data);
  RETURN public.process_sale_unchecked(sale_data);
END;
$$;
