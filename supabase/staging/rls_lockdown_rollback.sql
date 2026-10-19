-- =============================================================================
-- SOLO STAGING. Reversión de emergencia de rls_lockdown.sql.
--
-- Vuelve a desactivar RLS en las 18 tablas: el POS recupera el acceso que tenía
-- antes (y staging vuelve a quedar expuesto). Las políticas nuevas quedan
-- creadas pero sin efecto, para poder reactivar RLS después de corregir.
-- Los permisos revocados a anon NO se restauran: no los necesita ningún flujo.
-- =============================================================================

ALTER TABLE public.cash_turns DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_tanks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_types_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sizes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_acronyms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- anon volvía a necesitar SELECT completo sobre stores sin RLS:
GRANT SELECT ON public.stores TO anon;
