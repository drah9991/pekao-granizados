-- =============================================================================
-- SOLO STAGING (llzdxcujvagctnzjymqh). Fase 5 de docs/plans/staging-rls-lockdown.md
-- Requiere rls_lockdown.sql y sales_functions_guard.sql. Pruebas: build-grants-test.sh.
--
-- Cierra las advertencias del security advisor sobre funciones SECURITY DEFINER
-- que anon/authenticated podían llamar por /rest/v1/rpc, y fija search_path.
--
-- Los triggers siguen funcionando sin EXECUTE: Postgres solo comprueba ese
-- permiso al crear el trigger, no cada vez que se dispara.
--
-- Quedan expuestas a propósito:
--   anon:          get_digital_menu, create_mobile_order (carta y pedidos móviles).
--   authenticated: ventas, inventario, has_role y rls_* (las usan las políticas).
--
-- Idempotente: se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Funciones de trigger: nadie las llama por la API ------------------------------
REVOKE ALL ON FUNCTION public.check_inventory_stock_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_store_stock_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_recipe_to_relational_recipes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_pricing_rules_updated_at() FROM PUBLIC, anon, authenticated;

-- 2. Bloqueo de login ------------------------------------------------------------------
-- src/lib/rateLimiting.ts las envuelve, pero ningún archivo lo importa: hoy nadie
-- las llama. Antes anon podía borrar el bloqueo de cualquier cuenta
-- (clear_login_attempts) o bloquear cuentas ajenas (record_login_attempt).
-- Un bloqueo que registra el propio navegador se puede saltar; si se quiere de
-- verdad, debe ir en el servidor (Auth hook o edge function con service_role).

-- Solo service_role: son consultas previas al login y no hay quién las use.
REVOKE ALL ON FUNCTION public.is_account_locked(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_lockout_remaining_time(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_lockout_remaining_time(text) TO service_role;

-- Con sesión, y solo sobre el correo de auth.uid().
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  user_email text,
  user_ip text DEFAULT NULL,
  was_successful boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND lower(trim(user_email)) IS DISTINCT FROM
         (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo puedes registrar intentos de tu propia cuenta'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.login_attempts (email, ip_address, successful)
  VALUES (user_email, user_ip, was_successful);

  -- Limpiar intentos de más de 24 horas
  DELETE FROM public.login_attempts
  WHERE attempt_time < NOW() - INTERVAL '24 hours';
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_login_attempts(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND lower(trim(user_email)) IS DISTINCT FROM
         (SELECT lower(u.email) FROM auth.users u WHERE u.id = auth.uid()) THEN
    RAISE EXCEPTION 'Solo puedes limpiar los intentos de tu propia cuenta'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.login_attempts
  WHERE lower(email) = lower(trim(user_email))
    AND attempt_time > NOW() - INTERVAL '15 minutes';
END;
$$;

REVOKE ALL ON FUNCTION public.record_login_attempt(text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_login_attempts(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, text, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_login_attempts(text) TO authenticated, service_role;

-- 3. has_role y rls_* ------------------------------------------------------------------
-- has_role(_user_id, ...) dejaba averiguar el rol de cualquier usuario. Todas las
-- políticas y funciones la llaman con auth.uid(), así que ahora responde false
-- para cualquier otro id (salvo service_role).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (_user_id = auth.uid() OR coalesce(auth.role(), '') = 'service_role')
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    ),
    false
  );
$$;

-- Las políticas TO public también se evalúan para anon, y Postgres exige EXECUTE
-- sobre las funciones que usan aunque el resultado sea false (p. ej. "Admins and
-- managers can manage products" al leer la carta). Sin sesión has_role(auth.uid())
-- siempre es false, así que pasarlas a TO authenticated no cambia quién accede.
-- Las de storage.objects no se tocan (su dueño es supabase_storage_admin): ahí
-- anon solo tiene SELECT, y esas políticas no usan has_role.
DO $pol$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND roles = '{public}'
      AND (coalesce(qual, '') ~ 'has_role\(' OR coalesce(with_check, '') ~ 'has_role\(')
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END
$pol$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- Ninguna política que aplique a anon usa rls_*; get_digital_menu y
-- create_mobile_order las llaman como su dueño, no como anon.
REVOKE ALL ON FUNCTION public.rls_is_superadmin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rls_has_any_role(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rls_is_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rls_is_privileged() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rls_can_access_store(uuid) FROM PUBLIC, anon;

-- 4. search_path fijo --------------------------------------------------------------------
ALTER FUNCTION public.process_sale_unchecked(jsonb) SET search_path = public;
ALTER FUNCTION public.process_sale_with_stock_unchecked(uuid, uuid, numeric, numeric, numeric, jsonb, jsonb)
  SET search_path = public;
ALTER FUNCTION public.increment_inventory_stock_unchecked(uuid, uuid, numeric) SET search_path = public;
ALTER FUNCTION public.update_order_with_stock(jsonb) SET search_path = public;
ALTER FUNCTION public.cancel_sale_with_stock_restore(uuid, text) SET search_path = public;
ALTER FUNCTION public.check_store_stock_trigger() SET search_path = public;
ALTER FUNCTION public.update_pricing_rules_updated_at() SET search_path = public;
