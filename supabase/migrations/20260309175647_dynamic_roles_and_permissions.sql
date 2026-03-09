-- 1. Create the new dynamic roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean DEFAULT false, -- To protect core roles like admin
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view roles to populate dropdowns
CREATE POLICY "Everyone can view roles"
  ON public.roles FOR SELECT
  USING (true);

-- Only admins and managers can manage roles
CREATE POLICY "Admins and managers can manage roles"
  ON public.roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND (ur.role::text = 'admin' OR ur.role::text = 'manager')
    )
  );

-- Insert existing base roles into the new table
INSERT INTO public.roles (name, description, is_system) VALUES
  ('admin', 'Administrador Global', true),
  ('manager', 'Gerente de Tienda', true),
  ('cashier', 'Cajero', true),
  ('driver', 'Repartidor', true)
ON CONFLICT (name) DO NOTHING;

-- 2. Modify user_roles table to use string/text temporarily to avoid enum casting issues, 
-- or link directly to roles.id. Given has_role() expects text names, linking by name is easier for backwards compatibility,
-- but linking by ID is more robust. We will link by name first to gracefully transition, or better yet, link by role_id.
-- Wait, existing policies use `has_role(uid, 'admin')`. So if we keep 'admin' as a string, it's easier.
-- Let's change the `role` column from enum `app_role` to `text` and add a foreign key to `roles.name`.

ALTER TABLE public.user_roles 
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.user_roles
  ADD CONSTRAINT fk_user_roles_name 
  FOREIGN KEY (role) REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Drop the old app_role enum entirely, but it might be used in role_permissions table too.
ALTER TABLE public.role_permissions 
  ALTER COLUMN role TYPE text USING role::text;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT fk_role_permissions_name 
  FOREIGN KEY (role) REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE CASCADE;

-- Now we can drop the old enum type (it might have dependencies, so we CASCADE, but we already altered the columns above)
DROP TYPE IF EXISTS public.app_role CASCADE;

-- 3. Redefine has_role function to use text input
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
