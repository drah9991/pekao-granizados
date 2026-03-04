-- Migration to create the Inventory Item and Recipes base system.
-- This effectively replaces the reliance on the "store_stock" table for complex products.

-- 1. Create `inventory_items` table
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    unit_of_measure TEXT NOT NULL, -- e.g., 'ml', 'g', 'units'
    stock NUMERIC NOT NULL DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    cost_per_unit NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast lookup by store
CREATE INDEX idx_inventory_items_store ON public.inventory_items(store_id);

-- Enable RLS for inventory items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users in same store" 
ON public.inventory_items FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Enable all access for admins and managers" 
ON public.inventory_items FOR ALL 
USING (
    public.has_role('admin'::app_role, auth.uid()) OR public.has_role('manager'::app_role, auth.uid())
);

-- 2. Create `recipes` table to link products with inventory items
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_required NUMERIC NOT NULL, -- How much of the inventory item is needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(product_id, inventory_item_id) -- A product should only link to a specific item once
);

-- Add index on product_id for fast lookup when processing sales
CREATE INDEX idx_recipes_product ON public.recipes(product_id);

-- Enable RLS for recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users in same store" 
ON public.recipes FOR SELECT 
USING (
  EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = recipes.product_id
      AND products.store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
      )
  )
);

CREATE POLICY "Enable all access for admins and managers" 
ON public.recipes FOR ALL 
USING (
    public.has_role('admin'::app_role, auth.uid()) OR public.has_role('manager'::app_role, auth.uid())
);

-- Add trigger for updated_at in inventory_items
CREATE OR REPLACE FUNCTION set_inventory_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION set_inventory_updated_at();
