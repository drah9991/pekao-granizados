-- ==============================================================================
-- Migration: Fix Product Categories Sync (e.g. MANGO BICHE SL)
-- Description: Ensures products with type 'granizado' that were categorized under 'CÓCTELES'
--              are correctly assigned to the 'GRANIZADOS' category.
-- ==============================================================================

DO $$
DECLARE
    granizados_cat_id UUID;
BEGIN
    -- 1. Get or create the canonical 'GRANIZADOS' category
    SELECT id INTO granizados_cat_id
    FROM public.categories
    WHERE upper(trim(name)) = 'GRANIZADOS' AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    IF granizados_cat_id IS NULL THEN
        INSERT INTO public.categories (name, description, color_hex, is_active)
        VALUES ('GRANIZADOS', 'Categoría principal de Granizados', '#ec4899', true)
        RETURNING id INTO granizados_cat_id;
    END IF;

    -- 2. Re-assign products named 'MANGO BICHE%' or with type='granizado' that were under 'CÓCTELES'
    UPDATE public.products
    SET 
        category = 'GRANIZADOS',
        category_id = granizados_cat_id
    WHERE 
        (upper(name) LIKE '%MANGO BICHE%' OR (type::text = 'granizado' AND upper(trim(category)) = 'CÓCTELES'))
        AND store_id IS NOT NULL;

    -- 3. Ensure all products with NULL category_id get linked to their text category ID if found
    UPDATE public.products p
    SET category_id = c.id
    FROM public.categories c
    WHERE p.category_id IS NULL 
      AND p.category IS NOT NULL 
      AND upper(trim(p.category)) = upper(trim(c.name));
END $$;
