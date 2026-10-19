-- =============================================================================
-- Solo administradores y gerentes pueden SUMAR cantidades al inventario
--
-- Antes un cajero podía subir stock: registrar preparaciones (/preparation),
-- llamar increment_inventory_stock o escribir inventory_items directamente.
-- Este trigger rechaza cualquier aumento de inventory_items.stock o
-- store_stock.qty cuando quien llama (por la API) no es admin, gerente o
-- superadmin. Las disminuciones (ventas, mermas, vaciar tanque) no cambian.
--
-- Aplica también dentro de funciones SECURITY DEFINER: auth.uid() sigue siendo
-- el usuario de la petición. Las llamadas sin usuario de la API (service_role,
-- SQL directo, migraciones, tareas programadas) no se restringen.
-- Error 42501 (HTTP 403).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.can_increase_stock()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Fuera de la API (service_role, SQL directo): sin restricción.
    coalesce(auth.role(), '') NOT IN ('anon', 'authenticated')
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid() AND r.role::text IN ('admin', 'manager')
    )
    OR coalesce((SELECT p.is_superadmin FROM public.profiles p WHERE p.id = auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public.can_increase_stock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_increase_stock() TO authenticated, service_role;

-- TG_ARGV[0]: columna de cantidad de la tabla (stock o qty).
CREATE OR REPLACE FUNCTION public.guard_stock_increase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column text := TG_ARGV[0];
  v_old numeric := 0;
  v_new numeric;
BEGIN
  v_new := coalesce((to_jsonb(NEW) ->> v_column)::numeric, 0);
  IF TG_OP = 'UPDATE' THEN
    v_old := coalesce((to_jsonb(OLD) ->> v_column)::numeric, 0);
  END IF;

  IF v_new > v_old AND NOT public.can_increase_stock() THEN
    RAISE EXCEPTION 'Solo administradores y gerentes pueden sumar cantidades al inventario'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_stock_increase() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_stock_increase ON public.inventory_items;
CREATE TRIGGER guard_stock_increase
  BEFORE INSERT OR UPDATE OF stock ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_stock_increase('stock');

DROP TRIGGER IF EXISTS guard_stock_increase ON public.store_stock;
CREATE TRIGGER guard_stock_increase
  BEFORE INSERT OR UPDATE OF qty ON public.store_stock
  FOR EACH ROW EXECUTE FUNCTION public.guard_stock_increase('qty');
