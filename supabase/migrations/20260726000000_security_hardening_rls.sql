-- ==============================================================================
-- Migration: Security Hardening RLS and Data Integrity Constraints
-- Description: Hardens RLS policies on workflow_versions and adds check constraints
--              to prevent invalid negative values in products and stock.
-- ==============================================================================

-- 1. Hardening RLS on workflow_versions for owner CRUD
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workflow_versions'
    ) THEN
        ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "owner can read versions" ON public.workflow_versions;
        DROP POLICY IF EXISTS "owner can CRUD versions" ON public.workflow_versions;

        CREATE POLICY "owner can CRUD versions" ON public.workflow_versions
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.workflows w 
                    WHERE w.id = workflow_versions.workflow_id 
                      AND w.user_id = auth.uid()
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.workflows w 
                    WHERE w.id = workflow_versions.workflow_id 
                      AND w.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- 2. Ensure RLS is enabled on suppliers
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suppliers'
    ) THEN
        ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "authenticated users can access suppliers" ON public.suppliers;
        CREATE POLICY "authenticated users can access suppliers" ON public.suppliers
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 3. Data Integrity Constraints (non-negative price & cost)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_price_non_negative'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_price_non_negative CHECK (price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_non_negative'
    ) THEN
        ALTER TABLE public.products 
        ADD CONSTRAINT products_cost_non_negative CHECK (cost IS NULL OR cost >= 0);
    END IF;
END $$;
