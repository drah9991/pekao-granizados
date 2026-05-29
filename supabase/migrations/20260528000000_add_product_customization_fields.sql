-- Add customization fields to products table for better parameterization and metrics.
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS margin_target NUMERIC DEFAULT 60.0,
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS supplier_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE;

-- Document comments for columns
COMMENT ON COLUMN products.margin_target IS 'Porcentaje de margen operativo esperado (meta de ganancia)';
COMMENT ON COLUMN products.commission_rate IS 'Porcentaje de comisión de venta asignada a cajeros por este producto';
COMMENT ON COLUMN products.supplier_name IS 'Nombre del proveedor o distribuidor de este producto';
COMMENT ON COLUMN products.is_starred IS 'Destaca el producto en el catálogo POS y lo prioriza en el listado';
