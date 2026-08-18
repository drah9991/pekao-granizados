-- Eliminar la política recursiva que causaba el error 
DROP POLICY IF EXISTS "Superadmin_manage_all_profiles" ON public.profiles;
