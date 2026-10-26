-- Migration: 20261024180000_enable_realtime_for_orders.sql
-- Description: Idempotently enables Supabase Realtime publication on public.zanita_orders

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'zanita_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.zanita_orders;
  END IF;
END $$;
