-- Migration: Fix Categories Data Migration (Run after column additions)
-- Ensure category_id is populated in products and copy configuration from product_types_config to categories

-- 1. Sync category_id in products table by matching text name with categories table
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE (p.category_id IS NULL OR p.category_id <> c.id)
  AND LOWER(p.category) = LOWER(c.name);

-- 2. Populate operational parameters of existing categories based on their products
DO $$
DECLARE
    cat_rec RECORD;
    type_rec RECORD;
BEGIN
    FOR cat_rec IN SELECT id, name FROM public.categories
    LOOP
        -- Find the most common product type inside this category
        SELECT p.type INTO type_rec
        FROM public.products p
        WHERE p.category_id = cat_rec.id AND p.type IS NOT NULL
        GROUP BY p.type
        ORDER BY count(*) DESC
        LIMIT 1;

        IF type_rec.type IS NOT NULL THEN
            UPDATE public.categories
            SET 
                requires_recipe = COALESCE(pt.requires_recipe, requires_recipe),
                sales_mode = COALESCE(pt.sales_mode, sales_mode),
                track_mixture_inventory = COALESCE(pt.track_mixture_inventory, track_mixture_inventory),
                inventory_unit = COALESCE(pt.inventory_unit, inventory_unit),
                allow_toppings = COALESCE(pt.allow_toppings, allow_toppings),
                emoji_icon = COALESCE(pt.emoji_icon, emoji_icon),
                color_theme = COALESCE(pt.color_theme, color_theme),
                tax_rate = COALESCE(tax_rate, 0),
                alert_threshold = COALESCE(alert_threshold, 10)
            FROM public.product_types_config pt
            WHERE public.categories.id = cat_rec.id AND pt.code = type_rec.type::text;
        ELSE
            -- Fallback default configurations based on category name
            IF LOWER(cat_rec.name) LIKE '%granizado%' THEN
                UPDATE public.categories 
                SET requires_recipe = true, sales_mode = 'sizes', track_mixture_inventory = true, inventory_unit = 'ml', allow_toppings = true, emoji_icon = '🍧', color_theme = 'bg-cyan-500' 
                WHERE id = cat_rec.id;
            ELSIF LOWER(cat_rec.name) LIKE '%topping%' THEN
                UPDATE public.categories 
                SET requires_recipe = false, sales_mode = 'unit', track_mixture_inventory = false, inventory_unit = 'un', allow_toppings = false, emoji_icon = '🍒', color_theme = 'bg-rose-500' 
                WHERE id = cat_rec.id;
            ELSIF LOWER(cat_rec.name) LIKE '%sachet%' THEN
                UPDATE public.categories 
                SET requires_recipe = false, sales_mode = 'unit', track_mixture_inventory = false, inventory_unit = 'un', allow_toppings = false, emoji_icon = '🍶', color_theme = 'bg-violet-500' 
                WHERE id = cat_rec.id;
            ELSIF LOWER(cat_rec.name) LIKE '%dulce%' OR LOWER(cat_rec.name) LIKE '%sweet%' THEN
                UPDATE public.categories 
                SET requires_recipe = false, sales_mode = 'unit', track_mixture_inventory = false, inventory_unit = 'un', allow_toppings = false, emoji_icon = '🍬', color_theme = 'bg-amber-500' 
                WHERE id = cat_rec.id;
            END IF;
        END IF;
    END LOOP;
END $$;
