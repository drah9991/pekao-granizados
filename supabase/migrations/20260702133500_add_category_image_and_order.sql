-- Add image_url and sort_order columns to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
