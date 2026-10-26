-- =============================================================================
-- Bloquea la escalada de privilegios desde la propia fila de `profiles`.
--
-- En producción `authenticated` tiene UPDATE sobre toda la tabla `profiles` y la
-- política `tenant_profiles_isolation` (ALL, id = auth.uid(), sin WITH CHECK)
-- deja que cualquier usuario reescriba su fila. Con eso podía:
--   - cambiar `store_id` -> get_auth_store_id() le abre otra sede;
--   - poner `is_superadmin = true` -> "Superadmin_manage_all_stores";
--   - cambiar `role` -> políticas que usan get_user_role()/profiles.role.
-- Un REVOKE por columna no sirve: no anula el UPDATE a nivel de tabla.
--
-- Reglas (solo para llamadas con usuario; service_role, SQL y el trigger de
-- registro, que corren sin auth.uid(), no se restringen):
--   - `is_superadmin`: solo lo cambia un superadmin.
--   - `role`: solo lo cambian superadmin o admin.
--   - `store_id`: superadmin o admin a cualquier sede (como canChooseAnyStore
--     en src/lib/permissions.ts); un gerente solo puede asignar SU sede.
--
-- Reemplaza al trigger `guard_profile_privileges` (20261019010000, aplicado solo
-- en staging), que dejaba a cualquier miembro del personal cambiar su sede.
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_superadmin boolean;
  v_is_admin boolean;
  v_is_manager boolean;
  v_own_store_id uuid;
  -- `role` existe en producción pero no en staging: se lee vía jsonb para no fallar si falta.
  v_new_role text := to_jsonb(NEW)->>'role';
  v_old_role text := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)->>'role' END;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT coalesce(p.is_superadmin, false), p.store_id
    INTO v_is_superadmin, v_own_store_id
  FROM public.profiles p
  WHERE p.id = v_uid;

  v_is_superadmin := coalesce(v_is_superadmin, false)
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role::text = 'super_admin');
  v_is_admin := EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role::text = 'admin');
  v_is_manager := EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = v_uid AND r.role::text IN ('manager', 'store_manager')
  );

  IF v_is_superadmin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.is_superadmin, false) THEN
      RAISE EXCEPTION 'No autorizado para asignar superadmin' USING ERRCODE = '42501';
    END IF;
    IF v_new_role IS NOT NULL AND v_new_role <> 'customer' AND NOT v_is_admin THEN
      RAISE EXCEPTION 'No autorizado para asignar el rol' USING ERRCODE = '42501';
    END IF;
    IF NEW.store_id IS NOT NULL
       AND NOT (v_is_admin OR (v_is_manager AND v_own_store_id IS NOT NULL AND NEW.store_id IS NOT DISTINCT FROM v_own_store_id)) THEN
      RAISE EXCEPTION 'No autorizado para asignar la sede' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
    RAISE EXCEPTION 'No autorizado para cambiar superadmin' USING ERRCODE = '42501';
  END IF;
  IF v_new_role IS DISTINCT FROM v_old_role AND NOT v_is_admin THEN
    RAISE EXCEPTION 'No autorizado para cambiar el rol' USING ERRCODE = '42501';
  END IF;
  IF NEW.store_id IS DISTINCT FROM OLD.store_id
     AND NOT (v_is_admin OR (v_is_manager AND v_own_store_id IS NOT NULL AND NEW.store_id IS NOT DISTINCT FROM v_own_store_id)) THEN
    RAISE EXCEPTION 'No autorizado para cambiar la sede' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_profile_privileges() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
DROP TRIGGER IF EXISTS enforce_profile_privileges ON public.profiles;
CREATE TRIGGER enforce_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_privileges();
