-- =============================================================================
-- Menú público para la app móvil de clientes (rol anon)
--
-- Problema: los clientes de la app no inician sesión. `products` no tiene
-- ninguna política para `anon`, así que el catálogo llega vacío. Abrir la tabla
-- completa expondría `cost`, `recipe`, `margin_target`, `supplier_*`, etc.
--
-- Solución:
--   1. Asegurar las columnas `is_public` y `type` (staging no las tiene) y RLS.
--   2. Política RLS de solo lectura para `anon`, limitada a productos activos
--      y públicos.
--   3. Privilegios por columna: `anon` solo puede leer columnas de vitrina.
--   4. Vista `public_menu` (security_invoker) como contrato estable de la app.
-- =============================================================================

-- 1. Columnas requeridas (idempotente: producción ya las tiene) ---------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'product_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.product_type AS ENUM ('granizado', 'topping', 'sachet', 'sweet', 'combo');
  END IF;
END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type public.product_type NOT NULL DEFAULT 'granizado';

-- RLS obligatorio (producción ya lo tiene; staging lo tenía desactivado, lo que
-- dejaba a anon leer filas inactivas y ocultas).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Índice para las columnas de la política y el filtro por sede --------------
CREATE INDEX IF NOT EXISTS idx_products_public_menu
  ON public.products (store_id)
  WHERE active = true AND is_public = true;

-- 3. Política RLS de lectura para clientes anónimos ----------------------------
DROP POLICY IF EXISTS "anon_view_public_menu_products" ON public.products;
CREATE POLICY "anon_view_public_menu_products"
  ON public.products
  FOR SELECT
  TO anon
  USING (active = true AND is_public = true);

-- 4. Privilegios por columna: anon nunca ve costos, recetas ni proveedores ------
--    (anon no tiene políticas de escritura, así que quitar INSERT/UPDATE/DELETE/
--    TRUNCATE no cambia ningún flujo existente; TRUNCATE no pasa por RLS).
REVOKE ALL ON public.products FROM anon;
GRANT SELECT (id, name, description, price, images, category, category_id, type, store_id, active, is_public)
  ON public.products TO anon;

-- 5. Vista pública: contrato estable para la app móvil -------------------------
--    security_invoker = true: respeta la RLS de quien consulta (sin alertas de
--    "security definer view" en el advisor).
CREATE OR REPLACE VIEW public.public_menu
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.images,
  p.category,
  p.category_id,
  p.type,
  p.store_id
FROM public.products p
WHERE p.active = true
  AND p.is_public = true;

COMMENT ON VIEW public.public_menu IS
  'Catálogo público (solo columnas de vitrina) para la app móvil de clientes.';

REVOKE ALL ON public.public_menu FROM anon, authenticated;
GRANT SELECT ON public.public_menu TO anon, authenticated;
