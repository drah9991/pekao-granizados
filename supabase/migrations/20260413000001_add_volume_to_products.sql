-- Add volume parameterization fields to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS base_volume numeric,
ADD COLUMN IF NOT EXISTS unit_measure text DEFAULT 'oz';

-- Commentary: These fields allow for precise recipe calculations and descriptive sales.
