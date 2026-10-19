-- =============================================================================
-- SOLO STAGING (llzdxcujvagctnzjymqh). Aplicado el 2026-10-19 antes de copiar
-- el catálogo de producción con scripts/copy-catalog-to-staging.js.
--
-- Staging tenía objetos que producción no tiene, y que rechazaban sus datos reales:
-- 1. trg_sync_product_recipe: versión antigua que lee recipe[].quantity; los
--    productos reales usan quantity_oz y generaba recetas con cantidad nula.
--    Producción solo tiene on_products_updated. Se desactiva (no se borra).
-- 2. Restricciones CHECK de stock/cantidades/capacidad: producción no las tiene
--    y sus datos las incumplen (p. ej. un tanque con stock negativo).
-- =============================================================================

ALTER TABLE public.products DISABLE TRIGGER trg_sync_product_recipe;

ALTER TABLE public.inventory_items DROP CONSTRAINT IF EXISTS inventory_items_stock_check;
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_quantity_required_check;
ALTER TABLE public.store_stock DROP CONSTRAINT IF EXISTS store_stock_qty_check;
ALTER TABLE public.store_stock DROP CONSTRAINT IF EXISTS store_stock_min_qty_check;
ALTER TABLE public.machine_tanks DROP CONSTRAINT IF EXISTS machine_tanks_capacity_check;
