-- Añadir flag de superadmin a los perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean DEFAULT false;

-- Actualizar la tabla de stores para permitir bypass al superadmin
-- Nota: Asegúrate de que tu policy predeterminada actual de 'stores' permite el acceso por ID. Esta añade a los superadmins.
CREATE POLICY "Superadmin_manage_all_stores" ON public.stores
FOR ALL TO authenticated
USING ( (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = true )
WITH CHECK ( (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = true );

-- Crear policy también para perfiles por si el superadmin necesita ver a todos los dueños
CREATE POLICY "Superadmin_manage_all_profiles" ON public.profiles
FOR ALL TO authenticated
USING ( (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = true )
WITH CHECK ( (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) = true );
