-- Migration: Mix Management System
-- Description: Adds audit trail for mix preparations and a safe RPC for stock increment.

-- 1. Create mix_preparations table
CREATE TABLE IF NOT EXISTS public.mix_preparations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    liters NUMERIC NOT NULL,
    ml_converted NUMERIC NOT NULL,
    expected_cups INTEGER NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.mix_preparations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Staff can view preparations from their store" 
ON public.mix_preparations FOR SELECT 
USING (
  store_id IN (
    SELECT store_id FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Managers can record preparations" 
ON public.mix_preparations FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text IN ('admin', 'manager', 'staff'))
);

-- 4. RPC for Atomic Stock Increment
CREATE OR REPLACE FUNCTION public.increment_inventory_stock(
    p_item_id UUID,
    p_store_id UUID,
    p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.inventory_items
    SET stock = stock + p_amount,
        updated_at = NOW()
    WHERE id = p_item_id AND store_id = p_store_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item % in store % not found', p_item_id, p_store_id;
    END IF;
END;
$$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_mix_preparations_item ON public.mix_preparations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_mix_preparations_store ON public.mix_preparations(store_id);
CREATE INDEX IF NOT EXISTS idx_mix_preparations_created_at ON public.mix_preparations(created_at DESC);
