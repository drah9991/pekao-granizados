-- Migration to create categories table and integrate with products
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color_hex TEXT DEFAULT '#06b6d4', -- Cyan neón por defecto
    is_active BOOLEAN DEFAULT true,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Everyone can view active categories"
ON public.categories FOR SELECT
TO authenticated
USING (is_active = true);

-- Manage policy (Admins/Managers)
CREATE POLICY "Admins and managers can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') or 
  public.has_role(auth.uid(), 'manager')
);

-- Add category_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Index for category_id
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- Migration of existing text category to categories relation
DO $$
DECLARE
    prod_rec RECORD;
    new_cat_id UUID;
BEGIN
    -- Loop through all unique categories currently in products
    FOR prod_rec IN 
        SELECT DISTINCT category, store_id 
        FROM public.products 
        WHERE category IS NOT NULL AND category <> ''
    LOOP
        -- Check if a category with this name already exists
        SELECT id INTO new_cat_id 
        FROM public.categories 
        WHERE name = prod_rec.category;

        -- If not, create a new relational category
        IF new_cat_id IS NULL THEN
            INSERT INTO public.categories (name, description, color_hex, store_id)
            VALUES (
                prod_rec.category, 
                'Categoría migrada automáticamente desde el catálogo de productos.', 
                '#06b6d4', 
                prod_rec.store_id
            )
            RETURNING id INTO new_cat_id;
        END IF;

        -- Update all products matching this text category to point to the new category ID
        UPDATE public.products
        SET category_id = new_cat_id
        WHERE category = prod_rec.category;
    END LOOP;
END $$;
