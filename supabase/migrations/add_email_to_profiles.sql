ALTER TABLE public.profiles
ADD COLUMN email text NULL;

-- Opcional: Si quieres que el email sea único y no nulo después de la creación
-- ALTER TABLE public.profiles
-- ADD CONSTRAINT profiles_email_key UNIQUE (email);
-- ALTER TABLE public.profiles
-- ALTER COLUMN email SET NOT NULL;