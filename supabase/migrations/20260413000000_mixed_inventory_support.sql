-- Migration to support mixed inventory (Units and Volume)
-- This adds the is_mixture flag to identify inventory items that are prepared in batches.

ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_mixture BOOLEAN DEFAULT false;

-- Ensure numeric precision for quantities in recipes (ml)
ALTER TABLE public.recipes 
ALTER COLUMN quantity_required TYPE NUMERIC(12,4);

-- Add a comment to clarify the base unit
COMMENT ON COLUMN public.inventory_items.stock IS 'Stock level. For mixtures, this is stored in Milliliters (ml).';
