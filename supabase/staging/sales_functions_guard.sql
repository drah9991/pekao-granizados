-- =============================================================================
-- SOLO STAGING (llzdxcujvagctnzjymqh). Fase 3 de docs/plans/staging-rls-lockdown.md
-- Requiere rls_lockdown.sql (usa public.rls_is_staff()).
--
-- process_sale, process_sale_with_stock e increment_inventory_stock son
-- SECURITY DEFINER y no validaban quién las llama: un cliente con sesión de la
-- app móvil podía registrar ventas completadas y mover inventario.
--
-- Cada función original se renombra a *_unchecked (sin permisos para nadie) y
-- en su lugar queda una función con el MISMO nombre, parámetros y retorno que
-- valida al llamador y delega. El POS no cambia.
--
-- Código de error 42501 -> PostgREST responde 403. usePOS y el service worker
-- tratan 401/403 como "reintentar después" y CONSERVAN la venta en la cola
-- offline (con P0001/400 la descartarían como error de validación).
--
-- service_role (scripts de servidor) sigue pudiendo llamarlas.
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Renombrar las originales (solo la primera vez) --------------------------------
DO $rename$
BEGIN
  IF to_regprocedure('public.process_sale_unchecked(jsonb)') IS NULL THEN
    ALTER FUNCTION public.process_sale(jsonb) RENAME TO process_sale_unchecked;
  END IF;
  IF to_regprocedure('public.process_sale_with_stock_unchecked(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb)') IS NULL THEN
    ALTER FUNCTION public.process_sale_with_stock(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb)
      RENAME TO process_sale_with_stock_unchecked;
  END IF;
  IF to_regprocedure('public.increment_inventory_stock_unchecked(uuid, uuid, numeric)') IS NULL THEN
    ALTER FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) RENAME TO increment_inventory_stock_unchecked;
  END IF;
END
$rename$;

-- Nadie las llama directamente por la API: solo a través de las funciones con guarda.
REVOKE ALL ON FUNCTION public.process_sale_unchecked(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_sale_with_stock_unchecked(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_inventory_stock_unchecked(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;

-- 2. Guarda común --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_staff_caller()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN;
  END IF;
  IF NOT public.rls_is_staff() THEN
    RAISE EXCEPTION 'Solo el personal de Pekao puede realizar esta operación'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_staff_caller() FROM PUBLIC, anon, authenticated;

-- 3. Funciones públicas con el mismo contrato -----------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale(sale_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_staff_caller();
  RETURN public.process_sale_unchecked(sale_data);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_sale_with_stock(
  p_store_id uuid,
  p_user_id uuid,
  p_subtotal numeric,
  p_tax numeric,
  p_total numeric,
  p_payment jsonb,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_staff_caller();
  RETURN public.process_sale_with_stock_unchecked(p_store_id, p_user_id, p_subtotal, p_tax, p_total, p_payment, p_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_inventory_stock(p_item_id uuid, p_store_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_staff_caller();
  PERFORM public.increment_inventory_stock_unchecked(p_item_id, p_store_id, p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.process_sale(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_sale_with_stock(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_sale(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_sale_with_stock(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) TO authenticated, service_role;
