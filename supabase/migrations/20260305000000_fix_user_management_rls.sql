-- Add policies for Admins and Managers to manage ALL profiles
CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Add policies for managers to also manage user roles (admins already can)
CREATE POLICY "Managers can manage all roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'manager')
  );
