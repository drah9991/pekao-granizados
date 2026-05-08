-- =====================================================================
-- Migration: Bootstrap Config and Recipes
-- Description: Asegura que las parametrizaciones y recetas por defecto existan.
-- =====================================================================

-- 1. Poblar product_types_config si está vacío
INSERT INTO public.product_types_config 
    (code, label, emoji_icon, color_theme, sales_mode, track_mixture_inventory, inventory_unit, allow_toppings)
VALUES 
    ('granizado', 'Granizados', '🍧', 'bg-cyan-500', 'sizes', true, 'ml', true),
    ('topping', 'Toppings', '🍒', 'bg-rose-500', 'unit', false, 'un', false),
    ('sachet', 'Sachets', '🥃', 'bg-violet-500', 'unit', false, 'un', false),
    ('sweet', 'Dulces', '🍬', 'bg-amber-500', 'unit', false, 'un', false)
ON CONFLICT (code) DO UPDATE 
SET 
    sales_mode = EXCLUDED.sales_mode,
    track_mixture_inventory = EXCLUDED.track_mixture_inventory,
    inventory_unit = EXCLUDED.inventory_unit,
    allow_toppings = EXCLUDED.allow_toppings;

-- 2. Crear Tanques y Recetas para granizados huérfanos
DO $$
DECLARE
    prod RECORD;
    new_inv_id UUID;
BEGIN
    FOR prod IN 
        SELECT p.id, p.name, p.store_id 
        FROM public.products p
        WHERE (p.type::text = 'granizado' OR p.category = 'Granizado')
          AND NOT EXISTS (SELECT 1 FROM public.recipes r WHERE r.product_id = p.id)
    LOOP
        RAISE NOTICE '🔧 Creando tanque y receta para: %', prod.name;

        -- Crear Insumo de Inventario (Tanque)
        INSERT INTO public.inventory_items (
            store_id, name, unit, stock, is_mixture, created_at
        ) VALUES (
            prod.store_id,
            'Tanque ' || prod.name,
            'ml',
            0,
            TRUE,
            NOW()
        )
        RETURNING id INTO new_inv_id;

        -- Crear Receta (Vínculo)
        INSERT INTO public.recipes (
            product_id, inventory_item_id, quantity_required, created_at
        ) VALUES (
            prod.id,
            new_inv_id,
            4, -- Cantidad base aproximada por unidad sold (medida en ml = 4ml / units?) 
               -- Nota: Si es volumen real, esto se multiplica por el size multiplier.
            NOW()
        );
    END LOOP;
END;
$$;
