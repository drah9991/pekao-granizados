-- ==============================================================================
-- Migration: Fix Realtime Sync for Machine Tanks and Inventory Items
-- Description: Enables REPLICA IDENTITY FULL on inventory_items and machine_tanks
--              to ensure Supabase Realtime filters work on UPDATE events,
--              and ensures both tables are added to the supabase_realtime publication.
-- ==============================================================================

-- 1. Enable REPLICA IDENTITY FULL
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.machine_tanks REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'inventory_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'machine_tanks'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.machine_tanks;
    END IF;
  END IF;
END $$;
