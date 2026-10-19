-- Pruebas de rls_lockdown.sql. NO se ejecuta solo: build-rls-test.sh lo envuelve
-- junto con la migración en un DO que termina con RAISE EXCEPTION, así que
-- TODO se revierte (políticas, usuarios temporales y filas de prueba).
--
-- pg_temp.chk(sql) ejecuta como el rol actual y devuelve 'ok(n filas)' o 'ERR <sqlstate>'.
-- 42501 = bloqueado por permisos/RLS. ok(0) en UPDATE/SELECT = RLS filtró todo.

  CREATE FUNCTION pg_temp.chk(q text) RETURNS text LANGUAGE plpgsql AS $c$
  DECLARE n bigint;
  BEGIN
    EXECUTE q;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN 'ok(' || n || ')';
  EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR ' || SQLSTATE;
  END $c$;

  -- Usuarios temporales: cajero y gerente de la sede A, cliente sin rol.
  INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
    (v_cashier, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls.cajero@example.test', '{"name":"Cajero RLS"}', now(), now()),
    (v_manager, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls.gerente@example.test', '{"name":"Gerente RLS"}', now(), now()),
    (v_customer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls.cliente@example.test', '{"name":"Cliente RLS"}', now(), now());
  UPDATE public.profiles SET store_id = s_a WHERE id IN (v_cashier, v_manager);
  INSERT INTO public.user_roles (user_id, role) VALUES (v_cashier, 'cashier'), (v_manager, 'manager');
  SELECT r.user_id INTO v_admin FROM public.user_roles r WHERE r.role = 'admin' LIMIT 1;

  -- Datos en la sede B para probar el aislamiento entre sedes.
  INSERT INTO public.cash_turns (store_id, cashier_id, status) VALUES (s_b, v_admin, 'closed');
  INSERT INTO public.expenses (store_id, category, amount) VALUES (s_a, 'prueba', 1000), (s_b, 'prueba', 1000);
  INSERT INTO public.inventory_items (store_id, name) VALUES (s_b, 'Insumo B (prueba)');

  -- Catálogos vacíos en staging: sin filas, "ok(0)" no distingue bloqueo de ausencia.
  INSERT INTO public.sizes (name) VALUES ('Mediano (prueba)');
  INSERT INTO public.categories (name, is_active, store_id) VALUES ('Activa (prueba)', true, s_a), ('Inactiva (prueba)', false, s_a);
  INSERT INTO public.sku_acronyms (word, acronym) VALUES ('prueba', 'PRB');
  INSERT INTO public.product_types_config (type_name) VALUES ('prueba');
  INSERT INTO public.machine_tanks (store_id, name, capacity) VALUES (s_a, 'Tanque A (prueba)', 10), (s_b, 'Tanque B (prueba)', 10);
  INSERT INTO public.store_stock (store_id, product_id, qty) VALUES (s_a, p_mora, 5);

  -- anon -------------------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  res := res || E'\nanon: orders='            || pg_temp.chk('SELECT 1 FROM public.orders');
  res := res || ' insert_orders='             || pg_temp.chk(format('INSERT INTO public.orders (store_id, subtotal, total) VALUES (%L, 1, 1)', s_a));
  res := res || ' insert_user_roles='         || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''admin'')', v_customer));
  res := res || ' stores(id,name)='           || pg_temp.chk('SELECT id, name, config FROM public.stores');
  res := res || ' stores.subscription='       || pg_temp.chk('SELECT subscription_status FROM public.stores');
  res := res || ' product_types_config='      || pg_temp.chk('SELECT 1 FROM public.product_types_config');
  res := res || ' cash_turns='                || pg_temp.chk('SELECT 1 FROM public.cash_turns');
  res := res || ' profiles='                  || pg_temp.chk('SELECT 1 FROM public.profiles');
  res := res || ' public_menu='               || pg_temp.chk('SELECT 1 FROM public.public_menu');
  res := res || ' schema_migrations='         || pg_temp.chk('SELECT 1 FROM public.schema_migrations');
  res := res || ' rpc_process_sale='          || pg_temp.chk('SELECT public.process_sale(''{}''::jsonb)');

  -- cliente con sesión (sin rol) ----------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_customer, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ncliente: insert_user_roles=' || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''admin'')', v_customer));
  res := res || ' orders='                    || pg_temp.chk('SELECT 1 FROM public.orders');
  res := res || ' cash_turns='                || pg_temp.chk('SELECT 1 FROM public.cash_turns');
  res := res || ' inventory_items='           || pg_temp.chk('SELECT 1 FROM public.inventory_items');
  res := res || ' insert_expenses='           || pg_temp.chk(format('INSERT INTO public.expenses (store_id, category, amount) VALUES (%L, ''x'', 1)', s_a));
  res := res || ' user_roles='                || pg_temp.chk('SELECT 1 FROM public.user_roles');
  res := res || ' sizes='                     || pg_temp.chk('SELECT 1 FROM public.sizes');
  res := res || ' sku_acronyms='              || pg_temp.chk('SELECT 1 FROM public.sku_acronyms');

  -- cajero de la sede A -------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_cashier, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ncajero: cash_turns_B='     || pg_temp.chk(format('SELECT 1 FROM public.cash_turns WHERE store_id = %L', s_b));
  res := res || ' abrir_turno_A='             || pg_temp.chk(format('INSERT INTO public.cash_turns (store_id, cashier_id, status) VALUES (%L, %L, ''open'')', s_a, v_cashier));
  res := res || ' cerrar_turno_A='            || pg_temp.chk(format('UPDATE public.cash_turns SET status = ''closed'' WHERE store_id = %L AND cashier_id = %L', s_a, v_cashier));
  res := res || ' abrir_turno_B='             || pg_temp.chk(format('INSERT INTO public.cash_turns (store_id, cashier_id, status) VALUES (%L, %L, ''open'')', s_b, v_cashier));
  res := res || ' expenses_A='                || pg_temp.chk(format('SELECT 1 FROM public.expenses WHERE store_id = %L', s_a));
  res := res || ' expenses_B='                || pg_temp.chk(format('SELECT 1 FROM public.expenses WHERE store_id = %L', s_b));
  res := res || ' insert_expense_A='          || pg_temp.chk(format('INSERT INTO public.expenses (store_id, category, amount) VALUES (%L, ''x'', 1)', s_a));
  res := res || ' insert_insumo_A='           || pg_temp.chk(format('INSERT INTO public.inventory_items (id, store_id, name) VALUES (%L, %L, ''Tanque prueba'')', v_item_a, s_a));
  res := res || ' insert_insumo_B='           || pg_temp.chk(format('INSERT INTO public.inventory_items (store_id, name) VALUES (%L, ''x'')', s_b));
  res := res || ' vaciar_tanque_A='           || pg_temp.chk(format('UPDATE public.inventory_items SET stock = 0 WHERE id = %L', v_item_a));
  res := res || ' vincular_receta='           || pg_temp.chk(format('INSERT INTO public.recipes (product_id, inventory_item_id, quantity_required) VALUES (%L, %L, 4)', p_mora, v_item_a));
  res := res || ' borrar_receta='             || pg_temp.chk(format('DELETE FROM public.recipes WHERE inventory_item_id = %L', v_item_a));
  res := res || ' insert_movimiento_A='       || pg_temp.chk(format('INSERT INTO public.movements (product_id, store_id, qty, type, user_id) VALUES (%L, %L, 1, ''adjustment'', %L)', p_mora, s_a, v_cashier));
  res := res || ' orders_A='                  || pg_temp.chk(format('SELECT 1 FROM public.orders WHERE store_id = %L', s_a));
  res := res || ' insert_user_roles='         || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''admin'')', v_cashier));
  res := res || ' user_roles='                || pg_temp.chk('SELECT 1 FROM public.user_roles');
  res := res || ' profiles='                  || pg_temp.chk('SELECT 1 FROM public.profiles');
  res := res || ' editar_tamaños='            || pg_temp.chk('UPDATE public.sizes SET name = name');
  res := res || ' leer: sizes='               || pg_temp.chk('SELECT 1 FROM public.sizes');
  res := res || ' categories='                || pg_temp.chk('SELECT 1 FROM public.categories');
  res := res || ' tipos='                     || pg_temp.chk('SELECT 1 FROM public.product_types_config');
  res := res || ' sku='                       || pg_temp.chk('SELECT 1 FROM public.sku_acronyms');
  res := res || ' tanques_A='                 || pg_temp.chk(format('SELECT 1 FROM public.machine_tanks WHERE store_id = %L', s_a));
  res := res || ' stock_A='                   || pg_temp.chk(format('SELECT 1 FROM public.store_stock WHERE store_id = %L', s_a));
  res := res || ' insumos_B='                 || pg_temp.chk(format('SELECT 1 FROM public.inventory_items WHERE store_id = %L', s_b));
  res := res || ' tanques_B='                 || pg_temp.chk(format('SELECT 1 FROM public.machine_tanks WHERE store_id = %L', s_b));
  res := res || ' categorias_inactivas='      || pg_temp.chk('SELECT 1 FROM public.categories WHERE is_active = false');
  res := res || ' editar_categoria='          || pg_temp.chk('UPDATE public.categories SET name = name');

  -- gerente de la sede A ------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\ngerente: asignar_cajero=' || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''cashier'')', v_customer));
  res := res || ' asignar_admin='             || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''admin'')', v_customer));
  res := res || ' darse_admin='               || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''admin'')', v_manager));
  res := res || ' quitar_admin='              || pg_temp.chk(format('DELETE FROM public.user_roles WHERE user_id = %L', v_admin));
  res := res || ' user_roles='                || pg_temp.chk('SELECT 1 FROM public.user_roles');
  res := res || ' profiles='                  || pg_temp.chk('SELECT 1 FROM public.profiles');
  res := res || ' insert_expense_A='          || pg_temp.chk(format('INSERT INTO public.expenses (store_id, category, amount) VALUES (%L, ''x'', 1)', s_a));
  res := res || ' insert_expense_B='          || pg_temp.chk(format('INSERT INTO public.expenses (store_id, category, amount) VALUES (%L, ''x'', 1)', s_b));
  res := res || ' insert_categoria='          || pg_temp.chk('INSERT INTO public.categories (name) VALUES (''Categoría prueba'')');
  res := res || ' editar_tamaños='            || pg_temp.chk('UPDATE public.sizes SET name = name');
  res := res || ' cash_turns_B='              || pg_temp.chk(format('SELECT 1 FROM public.cash_turns WHERE store_id = %L', s_b));

  -- admin ------------------------------------------------------------------------------
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  res := res || E'\nadmin: asignar_admin='    || pg_temp.chk(format('INSERT INTO public.user_roles (user_id, role) VALUES (%L, ''admin'')', v_customer));
  res := res || ' cash_turns_B='              || pg_temp.chk(format('SELECT 1 FROM public.cash_turns WHERE store_id = %L', s_b));
  res := res || ' insumos_B='                 || pg_temp.chk(format('SELECT 1 FROM public.inventory_items WHERE store_id = %L', s_b));
  res := res || ' editar_sede='               || pg_temp.chk(format('UPDATE public.stores SET name = name WHERE id = %L', s_a));
  res := res || ' profiles='                  || pg_temp.chk('SELECT 1 FROM public.profiles');
  res := res || ' orders='                    || pg_temp.chk('SELECT 1 FROM public.orders');
  res := res || ' cancelar_pedido='           || pg_temp.chk(format('UPDATE public.orders SET status = status WHERE store_id = %L', s_a));
  RESET ROLE;

  RAISE EXCEPTION 'RESULTADO%', res;
