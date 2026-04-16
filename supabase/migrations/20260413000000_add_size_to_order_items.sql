-- Add size and size_multiplier to order_items to improve stock restoration accuracy
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS size text,
ADD COLUMN IF NOT EXISTS size_multiplier numeric DEFAULT 1;

-- Backfill existing records (if any)
UPDATE public.order_items SET size_multiplier = 1 WHERE size_multiplier IS NULL;
