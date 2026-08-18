-- ==============================================================================
-- Migration: Fix suppliers RLS regression
-- Contexto: la migración 20260726000000_security_hardening_rls.sql agregó una
-- política permisiva "authenticated users can access suppliers" (USING true,
-- WITH CHECK true, FOR ALL) sobre public.suppliers, SIN eliminar las políticas
-- correctas ya existentes desde 20260714131157_separate_suppliers_and_link_customers.sql
-- ("Everyone can view suppliers" y "Admins and managers can manage suppliers").
--
-- En PostgreSQL, múltiples políticas RLS permisivas para la misma tabla se
-- combinan con OR. El efecto neto fue que CUALQUIER usuario autenticado
-- (incluyendo cajeros) podía insertar, actualizar o eliminar proveedores,
-- porque la política permisiva "true" anula en la práctica la restricción de
-- rol de la política de gestión.
--
-- Esta migración elimina la política permisiva y restaura el modelo de acceso
-- previsto: lectura abierta a cualquier autenticado, escritura restringida a
-- roles de gestión (admin, manager, owner, store_manager).
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers'
    ) THEN
        -- Eliminar la política permisiva introducida por error
        DROP POLICY IF EXISTS "authenticated users can access suppliers" ON public.suppliers;

        -- Asegurar que las políticas correctas existen (idempotente: se recrean
        -- por si el nombre cambió o fueron eliminadas en algún punto)
        DROP POLICY IF EXISTS "Everyone can view suppliers" ON public.suppliers;
        CREATE POLICY "Everyone can view suppliers"
            ON public.suppliers FOR SELECT
            TO authenticated
            USING (true);

        DROP POLICY IF EXISTS "Admins and managers can manage suppliers" ON public.suppliers;
        CREATE POLICY "Admins and managers can manage suppliers"
            ON public.suppliers FOR ALL
            TO authenticated
            USING (
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'manager') OR
                public.has_role(auth.uid(), 'owner') OR
                public.has_role(auth.uid(), 'store_manager')
            )
            WITH CHECK (
                public.has_role(auth.uid(), 'admin') OR
                public.has_role(auth.uid(), 'manager') OR
                public.has_role(auth.uid(), 'owner') OR
                public.has_role(auth.uid(), 'store_manager')
            );
    END IF;
END $$;
