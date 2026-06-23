-- Migration: Create inventory_movements table and its related objects

-- 1. Create the enum type for movement types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_movement_type') THEN
        CREATE TYPE inventory_movement_type AS ENUM ('IN_PURCHASE', 'OUT_SALE', 'OUT_WASTE', 'ADJUSTMENT');
    END IF;
END $$;

-- 2. Create the inventory_movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    type inventory_movement_type NOT NULL,
    quantity NUMERIC NOT NULL,
    reference_id UUID, -- Can link to a sale, purchase order, or waste record depending on type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_id ON public.inventory_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies

-- Allow users to view movements for items in their store
CREATE POLICY "Enable read access for all users in same store" 
ON public.inventory_movements FOR SELECT 
USING (
  EXISTS (
      SELECT 1 FROM inventory_items 
      WHERE inventory_items.id = inventory_movements.inventory_item_id
      AND inventory_items.store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
      )
  )
);

-- Allow admins and managers full access
CREATE POLICY "Enable all access for admins and managers" 
ON public.inventory_movements FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager'))
);

-- Allow authenticated users (cashiers) to insert sale/waste movements if they have access to the store
CREATE POLICY "Enable insert for authenticated users in store" 
ON public.inventory_movements FOR INSERT 
WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_items 
      WHERE inventory_items.id = inventory_movements.inventory_item_id
      AND inventory_items.store_id IN (
        SELECT store_id FROM profiles WHERE id = auth.uid()
      )
  )
);
