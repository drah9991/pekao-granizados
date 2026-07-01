-- Create trigger function to sync JSONB recipe in products to relational recipes table
CREATE OR REPLACE FUNCTION public.sync_product_recipe_to_relational_recipes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recipe_json jsonb;
    r_item record;
BEGIN
    recipe_json := COALESCE(NEW.recipe, '[]'::jsonb);

    -- Ensure it is an array
    IF jsonb_typeof(recipe_json) != 'array' THEN
        recipe_json := '[]'::jsonb;
    END IF;

    -- Delete recipes no longer in the product's recipe array
    DELETE FROM public.recipes
    WHERE product_id = NEW.id
      AND inventory_item_id NOT IN (
          SELECT (elem->>'inventory_item_id')::uuid
          FROM jsonb_array_elements(recipe_json) AS elem
          WHERE elem->>'inventory_item_id' IS NOT NULL
      );

    -- Insert or update recipes in the array
    FOR r_item IN
        SELECT 
            (elem->>'inventory_item_id')::uuid AS inventory_item_id,
            (elem->>'quantity')::numeric AS quantity
        FROM jsonb_array_elements(recipe_json) AS elem
        WHERE elem->>'inventory_item_id' IS NOT NULL
    LOOP
        INSERT INTO public.recipes (product_id, inventory_item_id, quantity_required)
        VALUES (NEW.id, r_item.inventory_item_id, r_item.quantity)
        ON CONFLICT (product_id, inventory_item_id)
        DO UPDATE SET quantity_required = EXCLUDED.quantity_required;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Create trigger on public.products (AFTER INSERT OR UPDATE OF recipe)
DROP TRIGGER IF EXISTS trg_sync_product_recipe ON public.products;
CREATE TRIGGER trg_sync_product_recipe
AFTER INSERT OR UPDATE OF recipe ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_recipe_to_relational_recipes();
