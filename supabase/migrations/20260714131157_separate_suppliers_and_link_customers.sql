-- Migration: Separate suppliers into a table, relate them to products, and link customers to system profiles
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers
CREATE POLICY "Everyone can view suppliers"
  ON public.suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage suppliers"
  ON public.suppliers FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'manager')
  );

-- Populate suppliers from existing distinct supplier_names in products
INSERT INTO public.suppliers (name)
SELECT DISTINCT supplier_name 
FROM public.products 
WHERE supplier_name IS NOT NULL AND supplier_name <> ''
ON CONFLICT (name) DO NOTHING;

-- Add supplier_id to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- Update products supplier_id based on name matching
UPDATE public.products p
SET supplier_id = s.id
FROM public.suppliers s
WHERE p.supplier_name = s.name;

-- Add profile_id to customers table to link system users
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id);
