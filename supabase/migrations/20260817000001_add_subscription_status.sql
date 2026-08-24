-- Añadir control de suscripciones a la tabla de negocios (stores/tenants)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- Recargar la caché del esquema de PostgREST para que Supabase reconozca la nueva columna de inmediato
NOTIFY pgrst, 'reload schema';
