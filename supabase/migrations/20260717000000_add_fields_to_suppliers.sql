-- Add missing fields to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS commercial_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS nit_doc text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes text;
