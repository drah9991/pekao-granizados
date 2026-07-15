-- Migration: Add fields to movements table to support purchase invoices, suppliers and cash register withdrawals
ALTER TABLE public.movements 
  ADD COLUMN IF NOT EXISTS invoice_no text,
  ADD COLUMN IF NOT EXISTS supplier_name text,
  ADD COLUMN IF NOT EXISTS total_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debe numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_from_cash boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS movement_date timestamptz DEFAULT now();
