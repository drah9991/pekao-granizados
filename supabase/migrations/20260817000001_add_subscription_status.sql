-- Añadir control de suscripciones a la tabla de negocios (stores/tenants)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;
