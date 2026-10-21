-- Pruebas de function_grants_hardening.sql. NO se ejecuta solo: build-grants-test.sh
-- lo envuelve junto con la migración en un DO que termina con RAISE EXCEPTION,
-- así que TODO se revierte (permisos, usuarios temporales y filas de prueba).
--
-- pg_temp.chk(sql) devuelve 'ok(n filas)' o 'ERR <sqlstate>'.
-- pg_temp.val(sql) devuelve el primer valor o 'ERR <sqlstate>'.
-- 42501 = sin permiso.

  CREATE FUNCTION pg_temp.chk(q text) RETURNS text LANGUAGE plpgsql AS $c$
  DECLARE n bigint;
  BEGIN
    EXECUTE q;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN 'ok(' || n || ')';
  EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR ' || SQLSTATE;
  END $c$;

  CREATE FUNCTION pg_temp.val(q text) RETURNS text LANGUAGE plpgsql AS $c$
  DECLARE v text;
  BEGIN
    EXECUTE q INTO v;
    RETURN coalesce(v, 'null');
  EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR ' || SQLSTATE;
  END $c$;

  -- Usuarios temporales: gerente de la sede A y cliente sin rol.
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (v_manager, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grants.gerente@example.test', '{"name":"Gerente grants"}', now(), now()),
    (v_customer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grants.cliente@example.test', '{"name":"Cliente grants"}', now(), now());
  UPDATE public.profiles SET store_id = s_a WHERE id = v_manager;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_manager, 'manager');
  SELECT r.user_id INTO v_admin FROM public.user_roles r WHERE r.role = 'admin' LIMIT 1;
  SELECT p.id INTO v_product FROM public.products p LIMIT 1;
  INSERT INTO public.store_stock (store_id, product_id, qty) VALUES (s_a, v_product, 5) ON CONFLICT DO NOTHING;

  -- Estructura -----------------------------------------------------------------------
  res := res || E'\nanon_definer=' || coalesce((
    SELECT string_agg(p.proname, ',' ORDER BY p.proname)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE')), '-');
  res := res || ' search_path_mutable=' || (
    SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f' AND p.proconfig IS NULL);
  res := res || ' politicas_public_has_role=' || (
    SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND roles = '{public}'
      AND (coalesce(qual, '') ~ 'has_role\(' OR coalesce(with_check, '') ~ 'has_role\('));

  -- anon -------------------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  res := res || E'\nanon: products='          || pg_temp.chk('SELECT 1 FROM public.products');
  res := res || ' stores='                    || pg_temp.chk('SELECT 1 FROM public.stores');
  res := res || ' public_menu='               || pg_temp.chk('SELECT 1 FROM public.public_menu');
  res := res || ' digital_menu='              || pg_temp.chk(format('SELECT public.get_digital_menu(%L)', s_a));
  res := res || ' branding='                  || pg_temp.chk('SELECT 1 FROM storage.objects WHERE bucket_id = ''branding''');
  res := res || ' has_role='                  || pg_temp.val(format('SELECT public.has_role(%L, ''admin'')', v_admin));
  res := res || ' rls_is_staff='              || pg_temp.val('SELECT public.rls_is_staff()');
  res := res || ' is_account_locked='         || pg_temp.val('SELECT public.is_account_locked(''x@example.test'')');
  res := res || ' record_attempt='            || pg_temp.chk('SELECT public.record_login_attempt(''grants.cliente@example.test'', null, false)');
  res := res || ' clear_attempts='            || pg_temp.chk('SELECT public.clear_login_attempts(''grants.cliente@example.test'')');
  res := res || ' trigger_fn='                || pg_temp.chk('SELECT public.update_updated_at_column()');

  -- cliente con sesión (sin rol) ----------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_customer, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ncliente: has_role_admin_ajeno=' || pg_temp.val(format('SELECT public.has_role(%L, ''admin'')', v_admin));
  res := res || ' has_role_gerente_ajeno='    || pg_temp.val(format('SELECT public.has_role(%L, ''manager'')', v_manager));
  res := res || ' record_propio='             || pg_temp.chk('SELECT public.record_login_attempt(''Grants.Cliente@example.test'', null, true)');
  res := res || ' record_ajeno='              || pg_temp.chk('SELECT public.record_login_attempt(''grants.gerente@example.test'', null, false)');
  res := res || ' clear_propio='              || pg_temp.chk('SELECT public.clear_login_attempts(''grants.cliente@example.test'')');
  res := res || ' clear_ajeno='               || pg_temp.chk('SELECT public.clear_login_attempts(''grants.gerente@example.test'')');
  res := res || ' is_account_locked='         || pg_temp.val('SELECT public.is_account_locked(''grants.cliente@example.test'')');
  res := res || ' trigger_fn='                || pg_temp.chk('SELECT public.handle_new_user()');
  res := res || ' products='                  || pg_temp.chk('SELECT 1 FROM public.products');

  -- gerente de la sede A ------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ngerente: has_role_propio=' || pg_temp.val(format('SELECT public.has_role(%L, ''manager'')', v_manager));
  res := res || ' rls_is_privileged='         || pg_temp.val('SELECT public.rls_is_privileged()');
  -- Dispara update_updated_at_column y check_store_stock_trigger sin EXECUTE.
  res := res || ' editar_stock_A='            || pg_temp.chk(format('UPDATE public.store_stock SET qty = 0 WHERE store_id = %L AND product_id = %L', s_a, v_product));
  res := res || ' editar_producto='           || pg_temp.chk(format('UPDATE public.products SET name = name WHERE id = %L', v_product));
  res := res || ' pricing_rules='             || pg_temp.chk('SELECT 1 FROM public.pricing_rules');

  -- admin ------------------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\nadmin: has_role_propio=' || pg_temp.val(format('SELECT public.has_role(%L, ''admin'')', v_admin));
  res := res || ' editar_sede='               || pg_temp.chk(format('UPDATE public.stores SET name = name WHERE id = %L', s_a));
  res := res || ' role_permissions='          || pg_temp.chk('SELECT 1 FROM public.role_permissions');

  -- service_role -----------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  SET LOCAL ROLE service_role;
  res := res || E'\nservice_role: has_role_admin=' || pg_temp.val(format('SELECT public.has_role(%L, ''admin'')', v_admin));
  res := res || ' is_account_locked='         || pg_temp.val('SELECT public.is_account_locked(''grants.cliente@example.test'')');
  RESET ROLE;

  -- Notificación de stock bajo creada por el trigger del gerente.
  res := res || E'\nnotificacion_stock_bajo=' || (
    SELECT count(*) FROM public.notifications
    WHERE store_id = s_a AND type = 'inventory_low' AND (metadata->>'product_id')::uuid = v_product);

  RAISE EXCEPTION 'RESULTADO%', res;
