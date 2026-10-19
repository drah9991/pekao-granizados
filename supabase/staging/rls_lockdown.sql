-- =============================================================================
-- SOLO STAGING (llzdxcujvagctnzjymqh). NO aplicar en producción.
--
-- Activa RLS en las 18 tablas de staging que lo tenían desactivado, con
-- políticas que mantienen funcionando el POS. Producción tiene su propio
-- esquema de políticas (tenant_*); como las políticas permisivas se combinan
-- con OR, aplicar este archivo allí AMPLIARÍA accesos. Por eso no vive en
-- supabase/migrations/.
--
-- Modelo de acceso (igual al que el POS ya asume):
--   personal  = tiene fila en user_roles (admin, manager, cashier, driver) o es superadmin
--   sede      = profiles.store_id del usuario (el personal la elige al iniciar sesión)
--   acceso a una sede = superadmin, admin, o personal cuya sede es esa
--   privilegiado = superadmin, admin o manager
--
-- Requisito previo: arreglar /digital-menu (fase 0 del plan). Este archivo no
-- da a anon lectura de stock, recetas ni tanques.
-- Plan y resultados de prueba: docs/plans/staging-rls-lockdown.md
-- =============================================================================

-- 1. Funciones auxiliares (SECURITY DEFINER: leen roles/perfil sin pasar por RLS
--    y evitan la recursión de políticas que consultan user_roles).
CREATE OR REPLACE FUNCTION public.rls_has_any_role(p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text = ANY (p_roles));
$fn$;

CREATE OR REPLACE FUNCTION public.rls_is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce((SELECT p.is_superadmin FROM public.profiles p WHERE p.id = auth.uid()), false);
$fn$;

CREATE OR REPLACE FUNCTION public.rls_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public.rls_is_superadmin()
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid());
$fn$;

CREATE OR REPLACE FUNCTION public.rls_is_privileged()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public.rls_is_superadmin() OR public.rls_has_any_role(ARRAY['admin', 'manager']);
$fn$;

CREATE OR REPLACE FUNCTION public.rls_can_access_store(p_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public.rls_is_superadmin()
      OR public.rls_has_any_role(ARRAY['admin'])
      OR (
        EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid())
        AND p_store_id IS NOT NULL
        AND p_store_id = (SELECT p.store_id FROM public.profiles p WHERE p.id = auth.uid())
      );
$fn$;

REVOKE ALL ON FUNCTION public.rls_has_any_role(text[]), public.rls_is_superadmin(), public.rls_is_staff(),
  public.rls_is_privileged(), public.rls_can_access_store(uuid) FROM PUBLIC;
-- anon también las evalúa cuando una política aplica a todos los roles.
GRANT EXECUTE ON FUNCTION public.rls_has_any_role(text[]), public.rls_is_superadmin(), public.rls_is_staff(),
  public.rls_is_privileged(), public.rls_can_access_store(uuid) TO anon, authenticated;

-- 2. user_roles: quitar la política recursiva y la escalada de gerentes ------------
--    Antes: un gerente podía darse rol admin. Ahora solo asigna cajero/domiciliario.
DROP POLICY IF EXISTS "Managers can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_write" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manager_insert" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manager_delete" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.rls_is_privileged());
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.rls_is_superadmin() OR public.rls_has_any_role(ARRAY['admin']))
  WITH CHECK (public.rls_is_superadmin() OR public.rls_has_any_role(ARRAY['admin']));
CREATE POLICY "user_roles_manager_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.rls_has_any_role(ARRAY['manager']) AND role::text IN ('cashier', 'driver'));
CREATE POLICY "user_roles_manager_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.rls_has_any_role(ARRAY['manager']) AND role::text IN ('cashier', 'driver'));

-- 3. profiles: las políticas existentes consultan user_roles directamente; se
--    reemplazan por la función auxiliar (sin recursión). El trigger
--    guard_profile_privileges sigue protegiendo is_superadmin y store_id.
DROP POLICY IF EXISTS "Admins and managers can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
CREATE POLICY "Admins and managers can manage all profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.rls_is_privileged()) WITH CHECK (public.rls_is_privileged());

-- 4. Tablas con datos por sede ------------------------------------------------------
-- cash_turns: el personal abre, pausa y cierra turnos de su sede.
DROP POLICY IF EXISTS "Cajeros pueden ver turnos de su tienda" ON public.cash_turns;
DROP POLICY IF EXISTS "Cajeros pueden insertar turnos en su tienda" ON public.cash_turns;
DROP POLICY IF EXISTS "Cajeros pueden actualizar turnos de su tienda" ON public.cash_turns;
DROP POLICY IF EXISTS "cash_turns_staff" ON public.cash_turns;
CREATE POLICY "cash_turns_select" ON public.cash_turns FOR SELECT TO authenticated
  USING (public.rls_can_access_store(store_id));
CREATE POLICY "cash_turns_insert" ON public.cash_turns FOR INSERT TO authenticated
  WITH CHECK (public.rls_can_access_store(store_id));
CREATE POLICY "cash_turns_update" ON public.cash_turns FOR UPDATE TO authenticated
  USING (public.rls_can_access_store(store_id)) WITH CHECK (public.rls_can_access_store(store_id));

-- expenses: el personal ve los de su sede; solo admin/gerente los registra.
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (public.rls_can_access_store(store_id));
CREATE POLICY "expenses_write" ON public.expenses FOR ALL TO authenticated
  USING (public.rls_is_privileged() AND public.rls_can_access_store(store_id))
  WITH CHECK (public.rls_is_privileged() AND public.rls_can_access_store(store_id));

-- inventory_items: los cajeros crean y actualizan insumos de su sede (preparación
-- de mezclas en /preparation); borrar es solo de admin/gerente.
DROP POLICY IF EXISTS "Enable read access for all users in same store" ON public.inventory_items;
DROP POLICY IF EXISTS "Enable all access for admins and managers" ON public.inventory_items;
CREATE POLICY "inventory_items_select" ON public.inventory_items FOR SELECT TO authenticated
  USING (public.rls_can_access_store(store_id));
CREATE POLICY "inventory_items_insert" ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (public.rls_can_access_store(store_id));
CREATE POLICY "inventory_items_update" ON public.inventory_items FOR UPDATE TO authenticated
  USING (public.rls_can_access_store(store_id)) WITH CHECK (public.rls_can_access_store(store_id));
CREATE POLICY "inventory_items_delete" ON public.inventory_items FOR DELETE TO authenticated
  USING (public.rls_is_privileged() AND public.rls_can_access_store(store_id));

-- machine_tanks: lectura del personal de la sede; cambios de admin/gerente.
DROP POLICY IF EXISTS "Enable read access for all authorized users" ON public.machine_tanks;
DROP POLICY IF EXISTS "Enable all access for admins, managers and owners" ON public.machine_tanks;
DROP POLICY IF EXISTS "Enable write access for store managers in their store" ON public.machine_tanks;
CREATE POLICY "machine_tanks_select" ON public.machine_tanks FOR SELECT TO authenticated
  USING (public.rls_can_access_store(store_id));
CREATE POLICY "machine_tanks_write" ON public.machine_tanks FOR ALL TO authenticated
  USING (public.rls_is_privileged() AND public.rls_can_access_store(store_id))
  WITH CHECK (public.rls_is_privileged() AND public.rls_can_access_store(store_id));

-- movements: antes solo admin/gerente podían insertar, y los cajeros los
-- registran al preparar mezclas. Ahora: personal de la sede inserta; borrar es privilegiado.
DROP POLICY IF EXISTS "Managers can create movements" ON public.movements;
CREATE POLICY "movements_insert" ON public.movements FOR INSERT TO authenticated
  WITH CHECK (public.rls_can_access_store(store_id));
CREATE POLICY "movements_delete" ON public.movements FOR DELETE TO authenticated
  USING (public.rls_is_privileged() AND public.rls_can_access_store(store_id));

-- recipes: lectura para el personal; un cajero puede vincular un insumo de su sede
-- (preparación); editar o borrar recetas es de admin/gerente.
DROP POLICY IF EXISTS "Enable read access for all users in same store" ON public.recipes;
DROP POLICY IF EXISTS "Enable all access for admins and managers" ON public.recipes;
CREATE POLICY "recipes_select" ON public.recipes FOR SELECT TO authenticated
  USING (public.rls_is_staff());
CREATE POLICY "recipes_insert" ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (
    public.rls_is_privileged()
    OR EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = inventory_item_id AND public.rls_can_access_store(i.store_id)
    )
  );
CREATE POLICY "recipes_modify" ON public.recipes FOR UPDATE TO authenticated
  USING (public.rls_is_privileged()) WITH CHECK (public.rls_is_privileged());
CREATE POLICY "recipes_delete" ON public.recipes FOR DELETE TO authenticated
  USING (public.rls_is_privileged());

-- 5. Catálogos y configuración --------------------------------------------------------
-- categories: lectura de activas para usuarios con sesión; gestión privilegiada.
DROP POLICY IF EXISTS "Everyone can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins and managers can manage categories" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated
  USING (is_active = true OR public.rls_is_privileged());
CREATE POLICY "categories_write" ON public.categories FOR ALL TO authenticated
  USING (public.rls_is_privileged()) WITH CHECK (public.rls_is_privileged());

-- product_types_config: configuración no sensible; la lee también el menú público.
DROP POLICY IF EXISTS "product_types_config_admin_only_write" ON public.product_types_config;
DROP POLICY IF EXISTS "Admins and Managers can manage config" ON public.product_types_config;
CREATE POLICY "product_types_config_select" ON public.product_types_config FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "product_types_config_write" ON public.product_types_config FOR ALL TO authenticated
  USING (public.rls_is_privileged()) WITH CHECK (public.rls_is_privileged());

-- sizes y sku_acronyms: lectura para usuarios con sesión; gestión privilegiada.
DROP POLICY IF EXISTS "sizes_admin_only_write" ON public.sizes;
CREATE POLICY "sizes_select" ON public.sizes FOR SELECT TO authenticated USING (true);
CREATE POLICY "sizes_write" ON public.sizes FOR ALL TO authenticated
  USING (public.rls_is_privileged()) WITH CHECK (public.rls_is_privileged());

DROP POLICY IF EXISTS "sku_acronyms_admin_only_write" ON public.sku_acronyms;
CREATE POLICY "sku_acronyms_select" ON public.sku_acronyms FOR SELECT TO authenticated
  USING (public.rls_is_staff());
CREATE POLICY "sku_acronyms_write" ON public.sku_acronyms FOR ALL TO authenticated
  USING (public.rls_is_privileged()) WITH CHECK (public.rls_is_privileged());

-- stores: anon necesita nombre y marca (BrandingContext en páginas públicas).
-- Solo columnas de vitrina; nunca datos de suscripción.
CREATE POLICY "stores_public_select" ON public.stores FOR SELECT TO anon USING (true);
REVOKE ALL ON public.stores FROM anon;
GRANT SELECT (id, name, address, currency, config) ON public.stores TO anon;

-- 6. Activar RLS ------------------------------------------------------------------------
-- orders, order_items, invoices, store_stock: conservan sus políticas actuales.
-- schema_migrations: sin políticas (solo la usa el script con service role).
ALTER TABLE public.cash_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_acronyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 7. Defensa adicional: anon no escribe en ninguna de estas tablas -------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
  public.cash_turns, public.categories, public.expenses, public.inventory_items, public.invoices,
  public.machine_tanks, public.movements, public.order_items, public.orders, public.product_types_config,
  public.profiles, public.recipes, public.schema_migrations, public.sizes, public.sku_acronyms,
  public.store_stock, public.user_roles
FROM anon;
REVOKE ALL ON public.schema_migrations FROM anon, authenticated;

-- 8. Funciones de ventas: anon no debe ejecutarlas ------------------------------------
--    process_sale, process_sale_with_stock e increment_inventory_stock no validan
--    rol: un cliente con sesión aún podría llamarlas (ver fase 3 del plan).
REVOKE EXECUTE ON FUNCTION public.process_sale(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_sale_with_stock(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_inventory_stock(uuid, uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_order_with_stock(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_sale_with_stock_restore(uuid, text) FROM PUBLIC, anon;
