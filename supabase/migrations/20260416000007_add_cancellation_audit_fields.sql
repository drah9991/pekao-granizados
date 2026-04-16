-- ==============================================================================
-- Migration: Add Cancellation Audit Fields to Orders
-- Description: Agrega las columnas físicamente a la base de datos para registrar
--              quién, cuándo y por qué se anuló una venta, permitiendo
--              el correcto funcionamiento de 'cancel_sale_with_stock_restore'.
-- ==============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
