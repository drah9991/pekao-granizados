-- ==============================================================================
-- Migration: Deduplicate and Cleanup Categories
-- Description: Unifies duplicate category names, fixes typos (e.g. SASHETS -> SACHETS),
--              re-links affected products to canonical category IDs, and deactivates duplicates.
-- ==============================================================================

DO $$
DECLARE
    canonical_sachets_id UUID;
    duplicate_rec RECORD;
BEGIN
    -- 1. Fix typos in category names
    UPDATE public.categories
    SET name = 'SACHETS'
    WHERE upper(trim(name)) = 'SASHETS';

    -- 2. Find or create the canonical 'SACHETS' category
    SELECT id INTO canonical_sachets_id
    FROM public.categories
    WHERE upper(trim(name)) = 'SACHETS' AND is_active = true
    ORDER BY created_at ASC
    LIMIT 1;

    -- If SACHETS category exists, merge all other duplicates into it
    IF canonical_sachets_id IS NOT NULL THEN
        -- Re-link products pointing to duplicate SACHETS/SASHETS categories
        FOR duplicate_rec IN 
            SELECT id FROM public.categories 
            WHERE upper(trim(name)) IN ('SACHETS', 'SASHETS') 
            AND id <> canonical_sachets_id
        LOOP
            UPDATE public.products
            SET category_id = canonical_sachets_id, category = 'SACHETS'
            WHERE category_id = duplicate_rec.id OR upper(trim(category)) IN ('SACHETS', 'SASHETS');

            -- Deactivate duplicate category
            UPDATE public.categories
            SET is_active = false
            WHERE id = duplicate_rec.id;
        END LOOP;
    END IF;

    -- 3. Deactivate 'TEST' or invalid test categories if present
    UPDATE public.categories
    SET is_active = false
    WHERE upper(trim(name)) IN ('TEST', 'PRUEBA', 'DEMO');

    -- 4. General deduplication loop for any other duplicate category names (Case-Insensitive)
    FOR duplicate_rec IN
        SELECT lower(trim(name)) as norm_name, count(*)
        FROM public.categories
        WHERE is_active = true
        GROUP BY lower(trim(name))
        HAVING count(*) > 1
    LOOP
        -- Keep the oldest category and deactivate newer duplicates
        WITH ranked_cats AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
            FROM public.categories
            WHERE lower(trim(name)) = duplicate_rec.norm_name AND is_active = true
        ),
        target_cat AS (
            SELECT id FROM ranked_cats WHERE rnum = 1
        ),
        dups_to_remove AS (
            SELECT id FROM ranked_cats WHERE rnum > 1
        )
        UPDATE public.products p
        SET category_id = (SELECT id FROM target_cat)
        WHERE p.category_id IN (SELECT id FROM dups_to_remove);

        WITH ranked_cats AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rnum
            FROM public.categories
            WHERE lower(trim(name)) = duplicate_rec.norm_name AND is_active = true
        )
        UPDATE public.categories
        SET is_active = false
        WHERE id IN (SELECT id FROM ranked_cats WHERE rnum > 1);
    END LOOP;
END $$;
