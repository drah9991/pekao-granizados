-- =============================================================================
-- Políticas de admin/gerente acotadas por sede, y user_roles sin escalada.
--
-- En producción varias políticas solo miraban el rol, no la sede (las
-- permisivas se combinan con OR): un gerente de una sede editaba stock,
-- categorías, tanques, notificaciones, movimientos y la propia sede de otra.
-- Y `tenant_user_roles_isolation` (ALL, sin WITH CHECK) dejaba a un admin o
-- gerente asignar cualquier rol, incluido super_admin, que salta todo el
-- aislamiento. Además cualquier miembro podía escribir en la fila de su sede
-- (`tenant_stores_isolation` era ALL).
--
-- Modelo (el mismo de src/lib/permissions.ts y de rls_can_access_store en staging):
--   - superadmin y admin gestionan cualquier sede;
--   - gerente (manager/store_manager) solo la sede de su perfil;
--   - en user_roles: admin asigna cualquier rol menos super_admin a usuarios de
--     su sede; gerente solo cajero/domiciliario de su sede; cada usuario lee su fila.
--
-- Los auxiliares son SECURITY DEFINER (leen roles/perfil sin pasar por RLS ni
-- recursión) y no dependen de has_role/get_auth_store_id, que difieren entre
-- staging y producción. rls_has_any_role y rls_is_superadmin tienen el mismo
-- cuerpo que en supabase/staging/rls_lockdown.sql.
-- categories: un gerente ya no gestiona categorías sin sede (store_id NULL);
-- en producción no hay ninguna (0 de 9 al 2026-10-26).
-- Cada política se altera solo si existe con ese nombre: staging ya tiene sus
-- propias políticas (rls_lockdown) y solo comparte dos nombres con producción.
-- Idempotente.
-- =============================================================================

-- 1. Auxiliares ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rls_has_any_role(p_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text = ANY (p_roles));
$fn$;

CREATE OR REPLACE FUNCTION public.rls_is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce((SELECT p.is_superadmin FROM public.profiles p WHERE p.id = auth.uid()), false);
$fn$;

-- Nunca devuelve NULL: un gerente sin sede daba NULL y `IF NOT ...` lo dejaba pasar.
CREATE OR REPLACE FUNCTION public.rls_can_manage_store(p_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce(
    public.rls_is_superadmin()
      OR public.rls_has_any_role(ARRAY['super_admin', 'admin'])
      OR (
        public.rls_has_any_role(ARRAY['manager', 'store_manager'])
        AND p_store_id IS NOT NULL
        AND p_store_id = (SELECT p.store_id FROM public.profiles p WHERE p.id = auth.uid())
      ),
    false);
$fn$;

CREATE OR REPLACE FUNCTION public.rls_user_in_my_store(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles target
    JOIN public.profiles me ON me.id = auth.uid()
    WHERE target.id = p_user_id
      AND me.store_id IS NOT NULL
      AND target.store_id = me.store_id
  );
$fn$;

REVOKE ALL ON FUNCTION public.rls_has_any_role(text[]), public.rls_is_superadmin(),
  public.rls_can_manage_store(uuid), public.rls_user_in_my_store(uuid) FROM PUBLIC;
-- anon también las evalúa cuando una política aplica a todos los roles.
GRANT EXECUTE ON FUNCTION public.rls_has_any_role(text[]), public.rls_is_superadmin(),
  public.rls_can_manage_store(uuid), public.rls_user_in_my_store(uuid) TO anon, authenticated;

-- 2. Políticas de gestión acotadas por sede -------------------------------------
DO $policies$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'store_stock'
             AND policyname = 'Admins and managers can manage stock') THEN
    ALTER POLICY "Admins and managers can manage stock" ON public.store_stock
      USING (public.rls_can_manage_store(store_id))
      WITH CHECK (public.rls_can_manage_store(store_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notification_settings'
             AND policyname = 'Admins and managers can manage notification settings') THEN
    ALTER POLICY "Admins and managers can manage notification settings" ON public.notification_settings
      USING (public.rls_can_manage_store(store_id))
      WITH CHECK (public.rls_can_manage_store(store_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories'
             AND policyname = 'Admins and managers can manage categories') THEN
    ALTER POLICY "Admins and managers can manage categories" ON public.categories
      USING (public.rls_can_manage_store(store_id))
      WITH CHECK (public.rls_can_manage_store(store_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'machine_tanks'
             AND policyname = 'Enable all access for admins and managers') THEN
    ALTER POLICY "Enable all access for admins and managers" ON public.machine_tanks
      USING (public.rls_can_manage_store(store_id))
      WITH CHECK (public.rls_can_manage_store(store_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movements'
             AND policyname = 'Managers can create movements') THEN
    ALTER POLICY "Managers can create movements" ON public.movements
      WITH CHECK (public.rls_can_manage_store(store_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'movements'
             AND policyname = 'Managers can read movements') THEN
    ALTER POLICY "Managers can read movements" ON public.movements
      USING (public.rls_can_manage_store(store_id));
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stores'
             AND policyname = 'Admins and managers can manage stores') THEN
    ALTER POLICY "Admins and managers can manage stores" ON public.stores
      USING (public.rls_can_manage_store(id))
      WITH CHECK (public.rls_can_manage_store(id));
  END IF;

  -- Cualquier miembro escribía en la fila de su sede: queda solo lectura.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stores'
             AND policyname = 'tenant_stores_isolation') THEN
    DROP POLICY "tenant_stores_isolation" ON public.stores;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stores'
                 AND policyname = 'tenant_stores_select')
     AND to_regprocedure('public.get_auth_store_id()') IS NOT NULL THEN
    CREATE POLICY "tenant_stores_select" ON public.stores
      FOR SELECT
      USING (public.rls_is_superadmin() OR public.rls_has_any_role(ARRAY['super_admin']) OR id = public.get_auth_store_id());
  END IF;

  -- 3. user_roles sin escalada -------------------------------------------------
  --    La política ALL queda para escribir; la lectura va en una política aparte
  --    (cada usuario su fila; admin y gerente, los roles de su sede).
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'
             AND policyname = 'tenant_user_roles_isolation') THEN
    ALTER POLICY "tenant_user_roles_isolation" ON public.user_roles
      USING (
        public.rls_is_superadmin()
        OR public.rls_has_any_role(ARRAY['super_admin'])
        OR (
          public.rls_user_in_my_store(user_id)
          AND (
            (public.rls_has_any_role(ARRAY['admin']) AND role::text <> 'super_admin')
            OR (public.rls_has_any_role(ARRAY['manager', 'store_manager']) AND role::text IN ('cashier', 'driver'))
          )
        )
      )
      WITH CHECK (
        public.rls_is_superadmin()
        OR public.rls_has_any_role(ARRAY['super_admin'])
        OR (
          public.rls_user_in_my_store(user_id)
          AND (
            (public.rls_has_any_role(ARRAY['admin']) AND role::text <> 'super_admin')
            OR (public.rls_has_any_role(ARRAY['manager', 'store_manager']) AND role::text IN ('cashier', 'driver'))
          )
        )
      );

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'
                   AND policyname = 'user_roles_select_scope') THEN
      CREATE POLICY "user_roles_select_scope" ON public.user_roles
        FOR SELECT
        USING (
          user_id = auth.uid()
          OR (public.rls_user_in_my_store(user_id)
              AND public.rls_has_any_role(ARRAY['admin', 'manager', 'store_manager']))
        );
    END IF;
  END IF;
END
$policies$;
