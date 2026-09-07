-- Migration: Enable Realtime and Full Replica Identity for orders and expenses
-- Ensures UPDATE and DELETE events include complete row payloads for Supabase Realtime listeners

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.expenses REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'expenses'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
    END IF;
  END IF;
END $$;
