-- Add document_id (Cédula) to customers table for marketing/invoicing purposes
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS document_id text;

-- Create an index to speed up searches by document_id (useful for the POS search bar)
CREATE INDEX IF NOT EXISTS idx_customers_document_id ON public.customers(document_id);
