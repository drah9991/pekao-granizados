-- =============================================================================
-- Cuentas para la app móvil: clientes con registro propio + personal existente
--
-- 1. SEGURIDAD (crítico): la política "Users can update their own profile" deja
--    que cualquier usuario cambie CUALQUIER columna de su perfil, incluidas
--    `is_superadmin` y `store_id`. Con registro abierto a clientes, una cuenta
--    nueva sin roles podía volverse superadmin o unirse a una sede y leer sus
--    pedidos. El trigger `guard_profile_privileges` lo bloquea:
--      - `is_superadmin` solo lo cambia un superadmin.
--      - `store_id` solo lo cambia quien tiene un rol de personal (el POS deja
--        que el personal elija su sede al iniciar sesión) o un superadmin.
--    Las llamadas sin usuario (service role, SQL, trigger de registro) no se
--    restringen.
-- 2. Clientes: cada cuenta de cliente se vincula a una fila de `customers` por
--    `profile_id`. El cliente puede leer su propia fila; las escrituras pasan
--    por la RPC `upsert_my_customer`, que valida los datos y nunca toca
--    `total_spent` ni `last_order_at`.
-- =============================================================================

-- 1. Guardia de privilegios en profiles ----------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_superadmin boolean;
  v_is_staff boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(p.is_superadmin, false) INTO v_is_superadmin
  FROM public.profiles p
  WHERE p.id = v_uid;
  v_is_superadmin := coalesce(v_is_superadmin, false);

  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid) INTO v_is_staff;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.is_superadmin, false) AND NOT v_is_superadmin THEN
      RAISE EXCEPTION 'No autorizado para asignar superadmin' USING ERRCODE = '42501';
    END IF;
    IF NEW.store_id IS NOT NULL AND NOT (v_is_staff OR v_is_superadmin) THEN
      RAISE EXCEPTION 'No autorizado para asignar sede' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin AND NOT v_is_superadmin THEN
    RAISE EXCEPTION 'No autorizado para cambiar superadmin' USING ERRCODE = '42501';
  END IF;
  IF NEW.store_id IS DISTINCT FROM OLD.store_id AND NOT (v_is_staff OR v_is_superadmin) THEN
    RAISE EXCEPTION 'No autorizado para cambiar la sede' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_privileges() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- 2. Clientes vinculados a cuentas ---------------------------------------------
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS consent_habeas_data boolean DEFAULT false;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Una cuenta = un cliente. Índice también para la política RLS.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_profile_id
  ON public.customers (profile_id)
  WHERE profile_id IS NOT NULL;

DROP POLICY IF EXISTS "Customers can view own record" ON public.customers;
CREATE POLICY "Customers can view own record"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.upsert_my_customer(
  p_name text,
  p_phone text,
  p_consent_habeas_data boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := nullif(btrim(p_name), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_email text;
  v_customer_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión' USING ERRCODE = '42501';
  END IF;
  IF v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'El nombre debe tener entre 2 y 120 caracteres' USING ERRCODE = '22023';
  END IF;
  IF v_phone IS NOT NULL AND v_phone !~ '^\+?[0-9 ]{7,20}$' THEN
    RAISE EXCEPTION 'Teléfono inválido' USING ERRCODE = '22023';
  END IF;
  IF p_consent_habeas_data IS NOT TRUE THEN
    RAISE EXCEPTION 'Se requiere la autorización de tratamiento de datos' USING ERRCODE = '22023';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;

  UPDATE public.customers
  SET name = v_name,
      phone = v_phone,
      email = v_email,
      consent_habeas_data = true
  WHERE profile_id = v_uid
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (name, phone, email, consent_habeas_data, profile_id)
    VALUES (v_name, v_phone, v_email, true, v_uid)
    RETURNING id INTO v_customer_id;
  END IF;

  -- Mantener el perfil en sincronía (no toca columnas privilegiadas).
  UPDATE public.profiles SET name = v_name, phone = v_phone WHERE id = v_uid;

  RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_my_customer(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_my_customer(text, text, boolean) TO authenticated;
