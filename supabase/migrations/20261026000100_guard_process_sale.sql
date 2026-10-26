-- =============================================================================
-- process_sale solo para personal y solo en sedes a las que tiene acceso.
--
-- En producción process_sale(jsonb) es SECURITY DEFINER con EXECUTE para
-- `authenticated` y toma store_id y employee_id del JSON sin validarlos:
-- cualquier cuenta con sesión registraba ventas "completed" en cualquier sede
-- y movía su inventario.
--
-- Igual que supabase/staging/sales_functions_guard.sql: la función original
-- pasa a llamarse process_sale_unchecked (sin permisos para nadie) y queda una
-- process_sale con el MISMO contrato que valida y delega. El POS no cambia.
--   - Llamador: service_role, superadmin o un rol del POS (admin, manager,
--     store_manager, cashier, super_admin).
--   - Sede: superadmin y admin en cualquiera (como rls_can_access_store); el
--     resto, solo la de su perfil.
--   - employee_id: quien llama, o personal de esa sede (ventas offline que
--     sincroniza otro usuario del mismo equipo), o un admin/superadmin.
-- Los rechazos usan 42501 (PostgREST responde 403) y la cola offline del POS
-- conserva la venta como fallida en vez de borrarla.
--
-- update_order_with_stock(jsonb) es SECURITY DEFINER sin validación y ningún
-- cliente la llama: se le quita EXECUTE a anon/authenticated.
-- Idempotente: en staging process_sale_unchecked ya existe y solo se reemplaza
-- la función con guarda.
-- =============================================================================

DO $rename$
BEGIN
  IF to_regprocedure('public.process_sale_unchecked(jsonb)') IS NULL THEN
    ALTER FUNCTION public.process_sale(jsonb) RENAME TO process_sale_unchecked;
  END IF;
END
$rename$;

REVOKE ALL ON FUNCTION public.process_sale_unchecked(jsonb) FROM PUBLIC, anon, authenticated;

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

  RETURN public.process_sale_unchecked(sale_data);
END;
$$;

REVOKE ALL ON FUNCTION public.process_sale(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb) TO authenticated, service_role;

DO $revoke$
BEGIN
  IF to_regprocedure('public.update_order_with_stock(jsonb)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.update_order_with_stock(jsonb) FROM PUBLIC, anon, authenticated;
  END IF;
END
$revoke$;
