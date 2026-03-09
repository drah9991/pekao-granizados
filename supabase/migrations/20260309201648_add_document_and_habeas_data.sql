-- Agrear document_id a profiles si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_id text;

-- Agregar consent_habeas_data a profiles y customers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_habeas_data boolean DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS consent_habeas_data boolean DEFAULT false;

-- Notificar a PostgREST para recargar el esquema de caché
NOTIFY pgrst, 'reload schema';
