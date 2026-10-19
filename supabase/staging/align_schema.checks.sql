-- Pruebas de align_schema.sql. NO se ejecuta solo: build-align-test.sh lo envuelve
-- junto con el script (aplicado DOS veces, para probar que es idempotente) en un
-- DO que termina con RAISE EXCEPTION, así que TODO se revierte.
--
-- pg_temp.chk(sql) ejecuta como el rol actual y devuelve 'ok(n filas)' o 'ERR <sqlstate>'.
-- 42501 = bloqueado por permisos/RLS. ok(0) en SELECT = RLS filtró todo.

  CREATE FUNCTION pg_temp.chk(q text) RETURNS text LANGUAGE plpgsql AS $c$
  DECLARE n bigint;
  BEGIN
    EXECUTE q;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN 'ok(' || n || ')';
  EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR ' || SQLSTATE;
  END $c$;

  -- Columnas que espera el POS y que faltaban en staging.
  SELECT coalesce(string_agg(e.t || '.' || e.c, ', '), 'ninguna') INTO v_txt
  FROM (VALUES
    ('product_types_config', 'code'), ('product_types_config', 'store_id'), ('product_types_config', 'label'),
    ('product_types_config', 'emoji_icon'), ('product_types_config', 'color_theme'), ('product_types_config', 'sales_mode'),
    ('product_types_config', 'track_mixture_inventory'), ('product_types_config', 'inventory_unit'),
    ('product_types_config', 'allow_toppings'), ('product_types_config', 'requires_recipe'),
    ('product_types_config', 'active'), ('product_types_config', 'updated_at'),
    ('machine_tanks', 'current_volume_ml'), ('machine_tanks', 'max_capacity_ml'), ('machine_tanks', 'updated_at'),
    ('vw_tank_percentages', 'percentage'),
    ('inventory_items', 'unit'), ('inventory_items', 'is_mixture'),
    ('expenses', 'expense_date'),
    ('sizes', 'store_id'), ('sizes', 'capacity_value'), ('sizes', 'capacity_unit'), ('sizes', 'updated_at'),
    ('sku_acronyms', 'code'), ('sku_acronyms', 'type'), ('sku_acronyms', 'store_id'),
    ('categories', 'image_url'), ('categories', 'sort_order'), ('categories', 'sales_mode'),
    ('roles', 'name'), ('roles', 'is_system')
  ) AS e(t, c)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                    WHERE ic.table_schema = 'public' AND ic.table_name = e.t AND ic.column_name = e.c);
  res := res || E'\nfaltan_columnas=' || v_txt;

  SELECT coalesce(string_agg(table_name || '.' || column_name, ', '), 'ninguna') INTO v_txt
  FROM information_schema.columns
  WHERE table_schema = 'public' AND (table_name, column_name) IN (
    ('product_types_config', 'type_name'), ('product_types_config', 'config'), ('product_types_config', 'id'),
    ('machine_tanks', 'current_level'), ('machine_tanks', 'capacity'),
    ('inventory_items', 'unit_of_measure'), ('expenses', 'date'),
    ('sku_acronyms', 'word'), ('sku_acronyms', 'acronym'));
  res := res || E'\ncolumnas_heredadas=' || v_txt;

  -- Idempotencia: el script corrió dos veces; no debe duplicar restricciones.
  SELECT coalesce(string_agg(x, ', '), 'ninguna') INTO v_txt FROM (
    SELECT conrelid::regclass || ':' || pg_get_constraintdef(min(oid)) || ' x' || count(*) AS x
    FROM pg_constraint
    WHERE conrelid IN ('public.product_types_config'::regclass, 'public.sizes'::regclass,
                       'public.sku_acronyms'::regclass, 'public.categories'::regclass, 'public.machine_tanks'::regclass)
    GROUP BY conrelid, pg_get_constraintdef(oid) HAVING count(*) > 1
  ) d;
  res := res || E'\nrestricciones_duplicadas=' || v_txt;

  SELECT string_agg(code || CASE WHEN active THEN '' ELSE '(inactivo)' END, ',' ORDER BY code) INTO v_txt
  FROM public.product_types_config;
  res := res || E'\ntipos=' || v_txt;
  SELECT string_agg(name, ',' ORDER BY name) INTO v_txt FROM public.roles;
  res := res || ' roles=' || v_txt;
  SELECT relrowsecurity::text INTO v_txt FROM pg_class WHERE oid = 'public.roles'::regclass;
  res := res || ' roles_rls=' || v_txt;

  -- Usuarios temporales: cajero y gerente de la sede A.
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (v_cashier, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'align.cajero@example.test', '{"name":"Cajero align"}', now(), now()),
    (v_manager, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'align.gerente@example.test', '{"name":"Gerente align"}', now(), now());
  UPDATE public.profiles SET store_id = s_a WHERE id IN (v_cashier, v_manager);
  INSERT INTO public.user_roles (user_id, role) VALUES (v_cashier, 'cashier'), (v_manager, 'manager');

  -- anon: la carta pública ------------------------------------------------------------
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  SELECT string_agg((c->>'code') || ':' || jsonb_array_length(c->'items'), ',') INTO v_txt
  FROM jsonb_array_elements(to_jsonb(public.get_digital_menu(s_a))) c;
  res := res || E'\nanon: carta=' || coalesce(v_txt, 'vacía');
  res := res || ' tipos_activos=' || pg_temp.chk('SELECT 1 FROM public.product_types_config WHERE active');
  res := res || ' roles='         || pg_temp.chk('SELECT 1 FROM public.roles');
  res := res || ' insert_roles='  || pg_temp.chk('INSERT INTO public.roles (name) VALUES (''hacker'')');
  res := res || ' sizes='         || pg_temp.chk('SELECT 1 FROM public.sizes');
  res := res || ' tanques='       || pg_temp.chk('SELECT 1 FROM public.vw_tank_percentages');
  RESET ROLE;

  -- gerente de A: configura su sede -------------------------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ngerente: talla_A='  || pg_temp.chk(format('INSERT INTO public.sizes (name, multiplier, capacity_value, capacity_unit, store_id) VALUES (''PRUEBA'', 1, 16, ''oz'', %L)', s_a));
  res := res || ' talla_B='             || pg_temp.chk(format('INSERT INTO public.sizes (name, multiplier, store_id) VALUES (''PRUEBA'', 1, %L)', s_b));
  res := res || ' talla_global='        || pg_temp.chk('INSERT INTO public.sizes (name, multiplier) VALUES (''PRUEBA'', 1)');
  res := res || ' sku_A='               || pg_temp.chk(format('INSERT INTO public.sku_acronyms (type, code, store_id) VALUES (''granizado'', ''GR'', %L)', s_a));
  res := res || ' sku_B='               || pg_temp.chk(format('INSERT INTO public.sku_acronyms (type, code, store_id) VALUES (''granizado'', ''GR'', %L)', s_b));
  res := res || ' tanque_A='            || pg_temp.chk(format('INSERT INTO public.machine_tanks (store_id, name, current_volume_ml, max_capacity_ml) VALUES (%L, ''Tanque prueba'', 3000, 12000)', s_a));
  res := res || ' vista_tanques='       || pg_temp.chk(format('SELECT 1 FROM public.vw_tank_percentages WHERE store_id = %L AND percentage = 25', s_a));
  res := res || ' gasto_A='             || pg_temp.chk(format('INSERT INTO public.expenses (store_id, category, amount, expense_date) VALUES (%L, ''prueba'', 1000, ''2026-10-19'')', s_a));
  res := res || ' tipo_editar='         || pg_temp.chk('UPDATE public.product_types_config SET label = label WHERE code = ''granizado''');
  res := res || ' roles='               || pg_temp.chk('SELECT 1 FROM public.roles');
  res := res || ' crear_rol='           || pg_temp.chk('INSERT INTO public.roles (name) VALUES (''barista'')');
  RESET ROLE;

  -- cajero de A: lee y prepara mezclas, no configura ----------------------------------
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cashier, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ncajero: tallas_A=' || pg_temp.chk(format('SELECT 1 FROM public.sizes WHERE store_id = %L', s_a));
  res := res || ' sku_A='              || pg_temp.chk(format('SELECT 1 FROM public.sku_acronyms WHERE store_id = %L', s_a));
  res := res || ' tanques_A='          || pg_temp.chk(format('SELECT 1 FROM public.vw_tank_percentages WHERE store_id = %L', s_a));
  res := res || ' mezcla_A='           || pg_temp.chk(format('INSERT INTO public.inventory_items (store_id, name, unit, is_mixture, stock) VALUES (%L, ''Mezcla prueba'', ''ml'', true, 5000)', s_a));
  res := res || ' mezclas='            || pg_temp.chk(format('SELECT 1 FROM public.inventory_items WHERE store_id = %L AND is_mixture', s_a));
  res := res || ' gastos_A='           || pg_temp.chk(format('SELECT 1 FROM public.expenses WHERE store_id = %L AND expense_date = ''2026-10-19''', s_a));
  res := res || ' crear_talla='        || pg_temp.chk(format('INSERT INTO public.sizes (name, multiplier, store_id) VALUES (''X'', 1, %L)', s_a));
  res := res || ' tipos='              || pg_temp.chk('SELECT 1 FROM public.product_types_config WHERE active');
  RESET ROLE;

  RAISE EXCEPTION 'RESULTADO%', res;
