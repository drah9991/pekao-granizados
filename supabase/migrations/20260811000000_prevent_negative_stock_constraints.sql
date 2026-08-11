-- ==============================================================================
-- Migration: Prevent Negative Stock Constraints
-- Description: Agrega restricciones de integridad CHECK a las tablas store_stock 
--              e inventory_items para evitar físicamente valores de stock negativos 
--              a nivel de base de datos, garantizando consistencia en transacciones
--              concurrentes rápidas en el POS.
-- ==============================================================================

-- 1. Agregar restricción de no-negativos a la tabla store_stock (Productos físicos)
DO $$
BEGIN
    -- Validamos si ya existe el check de no_negative_qty para evitar errores
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'store_stock_qty_check'
    ) THEN
        ALTER TABLE public.store_stock 
        ADD CONSTRAINT store_stock_qty_check CHECK (qty >= 0.0);
    END IF;
END $$;

-- 2. Agregar restricción de no-negativos a la tabla inventory_items (Insumos de recetas y mezclas)
DO $$
BEGIN
    -- Validamos si ya existe el check de no_negative_stock para evitar errores
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'inventory_items_stock_check'
    ) THEN
        ALTER TABLE public.inventory_items 
        ADD CONSTRAINT inventory_items_stock_check CHECK (stock >= 0.0);
    END IF;
END $$;
