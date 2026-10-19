-- =============================================================================
-- SOLO STAGING (llzdxcujvagctnzjymqh). NO aplicar en producción.
--
-- Alinea las tablas de staging con el esquema que espera el POS
-- (src/integrations/supabase/types.ts y supabase/migrations/). Staging se creó
-- con 20250131000000_staging_consolidation.sql y muchas migraciones posteriores
-- quedaron registradas en schema_migrations sin efecto real: usaban
-- CREATE TABLE IF NOT EXISTS sobre tablas que ya existían con otra forma.
--
-- Idempotente: se puede ejecutar varias veces. Las columnas heredadas que
-- producción no tiene se eliminan solo si están vacías; si tienen datos, el
-- script se detiene para revisarlas a mano.
--
-- Mantiene el modelo de acceso de rls_lockdown.sql (aplicado antes):
--   sizes y sku_acronyms pasan a ser por sede, así que su escritura exige
--   además acceso a la sede; roles es nueva y sigue el mismo patrón.
-- Plan: docs/plans/staging-rls-lockdown.md («Alineación de esquema»).
-- =============================================================================

-- 1. product_types_config: forma de producción, con code como clave -------------
--    Antes: (id, type_name, config, created_at).
ALTER TABLE public.product_types_config
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS emoji_icon text DEFAULT '📦',
  ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'bg-slate-500',
  ADD COLUMN IF NOT EXISTS sales_mode text NOT NULL DEFAULT 'unit'
    CHECK (sales_mode IN ('sizes', 'unit', 'weight')),
  ADD COLUMN IF NOT EXISTS track_mixture_inventory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_unit text NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS allow_toppings boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_recipe boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alert_threshold integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $ptc$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'product_types_config' AND column_name = 'type_name') THEN
    IF EXISTS (SELECT 1 FROM public.product_types_config WHERE config IS NOT NULL AND config <> '{}'::jsonb) THEN
      RAISE EXCEPTION 'product_types_config.config tiene datos: revisarlos antes de eliminar la columna';
    END IF;
    UPDATE public.product_types_config
      SET code = coalesce(code, type_name), label = coalesce(label, initcap(type_name));
    ALTER TABLE public.product_types_config DROP CONSTRAINT IF EXISTS product_types_config_pkey;
    ALTER TABLE public.product_types_config DROP COLUMN id, DROP COLUMN type_name, DROP COLUMN config;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.product_types_config'::regclass AND contype = 'p') THEN
    ALTER TABLE public.product_types_config ADD CONSTRAINT product_types_config_pkey PRIMARY KEY (code);
  END IF;
END $ptc$;

UPDATE public.product_types_config SET label = initcap(code) WHERE label IS NULL;
ALTER TABLE public.product_types_config ALTER COLUMN label SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_types_config_store_id ON public.product_types_config (store_id);

DROP TRIGGER IF EXISTS update_product_types_config_updated_at ON public.product_types_config;
CREATE TRIGGER update_product_types_config_updated_at
  BEFORE UPDATE ON public.product_types_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sin datos semilla: el catálogo de staging se importa desde producción
-- (stores, categories, product_types_config, sizes, sku_acronyms, products,
-- inventory_items, recipes, store_stock, machine_tanks).

-- 2. machine_tanks: volúmenes en ml (20260522000000_create_machine_tanks_system) --
--    Antes: capacity y current_level.
DO $tanks$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'machine_tanks' AND column_name = 'current_level') THEN
    ALTER TABLE public.machine_tanks RENAME COLUMN current_level TO current_volume_ml;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'machine_tanks' AND column_name = 'capacity') THEN
    ALTER TABLE public.machine_tanks RENAME COLUMN capacity TO max_capacity_ml;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.machine_tanks'::regclass AND conname = 'unique_store_tank_name') THEN
    ALTER TABLE public.machine_tanks ADD CONSTRAINT unique_store_tank_name UNIQUE (store_id, name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.machine_tanks'::regclass AND conname = 'machine_tanks_inventory_item_id_fkey') THEN
    ALTER TABLE public.machine_tanks ADD CONSTRAINT machine_tanks_inventory_item_id_fkey
      FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE SET NULL;
  END IF;
END $tanks$;

UPDATE public.machine_tanks SET current_volume_ml = 0 WHERE current_volume_ml IS NULL;
ALTER TABLE public.machine_tanks
  ALTER COLUMN current_volume_ml SET DEFAULT 0,
  ALTER COLUMN current_volume_ml SET NOT NULL,
  ALTER COLUMN max_capacity_ml SET DEFAULT 12000,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS update_machine_tanks_updated_at ON public.machine_tanks;
CREATE TRIGGER update_machine_tanks_updated_at
  BEFORE UPDATE ON public.machine_tanks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vista que usa useTankStatus. security_invoker: respeta el RLS de machine_tanks.
CREATE OR REPLACE VIEW public.vw_tank_percentages WITH (security_invoker = on) AS
SELECT
  id,
  store_id,
  name,
  current_volume_ml,
  max_capacity_ml,
  round((current_volume_ml / nullif(max_capacity_ml, 0)) * 100, 2) AS percentage,
  updated_at,
  inventory_item_id
FROM public.machine_tanks;
REVOKE ALL ON public.vw_tank_percentages FROM anon;
GRANT SELECT ON public.vw_tank_percentages TO authenticated;

-- 3. inventory_items: unit e is_mixture ------------------------------------------
--    El POS escribe unit (no unit_of_measure) y filtra por is_mixture.
DO $inv$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'unit_of_measure') THEN
    ALTER TABLE public.inventory_items RENAME COLUMN unit_of_measure TO unit;
  END IF;
END $inv$;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS is_mixture boolean DEFAULT false;
ALTER TABLE public.inventory_items ALTER COLUMN unit SET DEFAULT 'un';

-- La función de alerta de stock leía unit_of_measure.
CREATE OR REPLACE FUNCTION public.check_inventory_stock_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  -- Solo notifica cuando el stock cruza el mínimo (evita repetir alertas).
  IF (NEW.stock <= NEW.min_stock) AND (OLD.stock > NEW.min_stock OR OLD.stock IS NULL) THEN
    INSERT INTO public.notifications (store_id, title, message, type, priority, metadata)
    VALUES (
      NEW.store_id,
      'Inventario Bajo: ' || NEW.name,
      'El artículo "' || NEW.name || '" tiene un stock de ' || NEW.stock || ' ' || NEW.unit || '. El mínimo es ' || NEW.min_stock || '.',
      'inventory_low',
      'high',
      jsonb_build_object('item_id', NEW.id, 'current_stock', NEW.stock, 'min_stock', NEW.min_stock)
    );
  END IF;
  RETURN NEW;
END;
$fn$;

-- 4. expenses: expense_date (fecha sin hora, como la envía el formulario) ---------
DO $exp$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'date') THEN
    ALTER TABLE public.expenses RENAME COLUMN date TO expense_date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'expense_date'
               AND data_type <> 'date') THEN
    ALTER TABLE public.expenses ALTER COLUMN expense_date DROP DEFAULT;
    ALTER TABLE public.expenses ALTER COLUMN expense_date TYPE date
      USING (expense_date AT TIME ZONE 'America/Bogota')::date;
  END IF;
END $exp$;

ALTER TABLE public.expenses ALTER COLUMN expense_date SET DEFAULT current_date;
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON public.expenses (store_id);

-- 5. sizes: por sede, con capacidad ----------------------------------------------
ALTER TABLE public.sizes
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS capacity_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS capacity_unit text NOT NULL DEFAULT 'ml',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_sizes_store_id ON public.sizes (store_id);

DROP TRIGGER IF EXISTS update_sizes_updated_at ON public.sizes;
CREATE TRIGGER update_sizes_updated_at
  BEFORE UPDATE ON public.sizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. sku_acronyms: (type, code, store_id) -----------------------------------------
--    Antes: (word, acronym), sin sede.
DO $sku$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'sku_acronyms' AND column_name = 'acronym') THEN
    ALTER TABLE public.sku_acronyms RENAME COLUMN acronym TO code;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'sku_acronyms' AND column_name = 'word') THEN
    IF EXISTS (SELECT 1 FROM public.sku_acronyms) THEN
      RAISE EXCEPTION 'sku_acronyms tiene filas con el formato antiguo (word): asignarles type y store_id a mano';
    END IF;
    ALTER TABLE public.sku_acronyms DROP COLUMN word;
  END IF;
END $sku$;

ALTER TABLE public.sku_acronyms
  ADD COLUMN IF NOT EXISTS code text NOT NULL,
  ADD COLUMN IF NOT EXISTS type public.product_type NOT NULL,
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sku_acronyms_store_id ON public.sku_acronyms (store_id);

-- 7. categories: imagen, orden y comportamiento de venta --------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_recipe boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sales_mode text DEFAULT 'unit' CHECK (sales_mode IN ('sizes', 'unit', 'weight')),
  ADD COLUMN IF NOT EXISTS track_mixture_inventory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inventory_unit text DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS allow_toppings boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS emoji_icon text DEFAULT '📦',
  ADD COLUMN IF NOT EXISTS color_theme text DEFAULT 'bg-slate-500',
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alert_threshold integer DEFAULT 10;
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories (store_id);

-- 8. roles: catálogo de roles (20260309175647_dynamic_roles_and_permissions) -----
--    user_roles.role sigue siendo el enum app_role: las funciones rls_* lo leen como texto.
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.roles (name, description, is_system) VALUES
  ('admin', 'Administrador Global', true),
  ('manager', 'Gerente de Tienda', true),
  ('cashier', 'Cajero', true),
  ('driver', 'Repartidor', true)
ON CONFLICT (name) DO NOTHING;

-- 9. Políticas (mismo modelo que rls_lockdown.sql) --------------------------------
-- roles: lectura con sesión (llena desplegables); solo admin/superadmin escribe.
DROP POLICY IF EXISTS "roles_select" ON public.roles;
DROP POLICY IF EXISTS "roles_write" ON public.roles;
CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_write" ON public.roles FOR ALL TO authenticated
  USING (public.rls_is_superadmin() OR public.rls_has_any_role(ARRAY['admin']))
  WITH CHECK (public.rls_is_superadmin() OR public.rls_has_any_role(ARRAY['admin']));

-- sizes y sku_acronyms ahora son por sede: un gerente solo edita los de su sede.
-- Las filas sin sede (store_id NULL) quedan para admin/superadmin.
DROP POLICY IF EXISTS "sizes_write" ON public.sizes;
CREATE POLICY "sizes_write" ON public.sizes FOR ALL TO authenticated
  USING (public.rls_is_privileged() AND public.rls_can_access_store(store_id))
  WITH CHECK (public.rls_is_privileged() AND public.rls_can_access_store(store_id));

DROP POLICY IF EXISTS "sku_acronyms_write" ON public.sku_acronyms;
CREATE POLICY "sku_acronyms_write" ON public.sku_acronyms FOR ALL TO authenticated
  USING (public.rls_is_privileged() AND public.rls_can_access_store(store_id))
  WITH CHECK (public.rls_is_privileged() AND public.rls_can_access_store(store_id));

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.roles FROM anon;

-- PostgREST recarga el esquema solo (pgrst_ddl_watch); esto lo fuerza.
NOTIFY pgrst, 'reload schema';
