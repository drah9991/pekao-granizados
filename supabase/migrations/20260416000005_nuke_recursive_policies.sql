-- ==============================================================================
-- Migration: Nuke and Rebuild RLS Policies (Nuclear Option for Recursion)
-- Description: Elimina dinámicamente TODAS las políticas vulnerables a recursión 
--              infinita y asegura que "has_role" sea estricto y bypasser.
-- ==============================================================================

-- 1. Asegurarnos que has_role es 100% SECURITY DEFINER y evita recursión
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER   -- Escala permisos a Postgres para saltar el RLS de user_roles
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Limpiar TODAS las políticas de las tablas principales que puedan estar ocultas (usando un bucle dinámico)
DO $$ 
DECLARE 
    r record;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_roles', 'profiles', 'roles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. Recrear Políticas Limpias y Seguras usando solamente has_role()

-- ====================
-- USER ROLES
-- ====================
CREATE POLICY "user_roles_self_read" 
  ON public.user_roles FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin_manager_all" 
  ON public.user_roles FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- ====================
-- PROFILES
-- ====================
CREATE POLICY "profiles_self_select" 
  ON public.profiles FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" 
  ON public.profiles FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "profiles_self_insert" 
  ON public.profiles FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_manager_select" 
  ON public.profiles FOR SELECT 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "profiles_admin_manager_all" 
  ON public.profiles FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

-- ====================
-- ROLES
-- ====================
CREATE POLICY "roles_public_select" 
  ON public.roles FOR SELECT 
  USING (true);

CREATE POLICY "roles_admin_manager_all" 
  ON public.roles FOR ALL 
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );
