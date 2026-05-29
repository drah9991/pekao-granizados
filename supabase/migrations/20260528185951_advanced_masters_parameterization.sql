-- Migration: Parametrización avanzada de maestros (Product Types y Sizes)

-- 1. Añadir columnas a product_types_config
ALTER TABLE public.product_types_config
ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS alert_threshold integer NOT NULL DEFAULT 10;

-- 2. Añadir columnas a sizes
ALTER TABLE public.sizes
ADD COLUMN IF NOT EXISTS capacity_value numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS capacity_unit text NOT NULL DEFAULT 'ml';

-- Actualizar comentario de tabla product_types_config para clarificar la estructura
COMMENT ON COLUMN public.product_types_config.tax_rate IS 'Tasa de impuesto aplicada por defecto (ej. 19.00 para 19%)';
COMMENT ON COLUMN public.product_types_config.alert_threshold IS 'Umbral de nivel crítico de inventario base para este tipo';

-- Actualizar comentario de tabla sizes
COMMENT ON COLUMN public.sizes.capacity_value IS 'Valor numérico de la capacidad (ej. 16, 24)';
COMMENT ON COLUMN public.sizes.capacity_unit IS 'Unidad de medida de la capacidad (ej. oz, ml)';
