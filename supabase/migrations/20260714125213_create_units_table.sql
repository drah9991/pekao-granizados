-- Migration: Create units table and seed data
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view units"
  ON public.units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage units"
  ON public.units FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'manager')
  );

-- Seed initial units
INSERT INTO public.units (name) VALUES 
  ('Gr'),
  ('Kg'),
  ('Unidad')
ON CONFLICT (name) DO NOTHING;
