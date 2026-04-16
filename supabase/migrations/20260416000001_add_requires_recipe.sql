-- =====================================================================
-- Añadir configuración "Requiere Receta" al Maestro de Tipos de Producto
-- =====================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='product_types_config' AND column_name='requires_recipe'
    ) THEN
        ALTER TABLE public.product_types_config 
        ADD COLUMN requires_recipe boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Actualizamos el tipo "granizado" u otros que por lógica de negocio sí lo requieran
UPDATE public.product_types_config
SET requires_recipe = true
WHERE code = 'granizado';
