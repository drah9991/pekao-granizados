-- ==============================================================================
-- Migration: Fix RLS Infinite Recursion
-- Description: Replaces direct SELECTs to user_roles inside RLS policies with
--              the SECURITY DEFINER function `has_role()` to prevent infinite loops.
-- ==============================================================================

-- 1. Fix user_roles table
DROP POLICY IF EXISTS "Managers can manage all roles" ON public.user_roles;

CREATE POLICY "Managers can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin')
  );

-- Basic read policy for user_roles so users can read their own role if needed
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());


-- 2. Fix profiles table policies
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can manage all profiles" ON public.profiles;

CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  );


-- 3. Fix product_types_config table policies (from recent migrations)
DROP POLICY IF EXISTS "Admins and Managers can manage config" ON public.product_types_config;

-- Se reemplaza cualquier SELECT estricto en la config
CREATE POLICY "Admins and Managers can manage config"
    ON public.product_types_config FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
    );
