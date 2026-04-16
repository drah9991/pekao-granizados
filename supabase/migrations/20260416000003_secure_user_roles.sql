-- ==============================================================================
-- Migration: Enable RLS on user_roles
-- Description: Arregla advertencias de seguridad de Supabase 'RLS Disabled'.
-- ==============================================================================

-- Habilita Row Level Security obligatoriamente
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Ya tienes una política: "Managers can manage all roles"
-- Por si acaso necesitas una base para que los propios usuarios puedan ver su propia fila (opcional si falta en tu base de datos):
-- CREATE POLICY "Users can read own role"
--   ON public.user_roles
--   FOR SELECT
--   USING (auth.uid() = user_id);
