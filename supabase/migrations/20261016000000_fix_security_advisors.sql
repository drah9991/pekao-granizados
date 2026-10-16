-- ============================================
-- CORRECCIÓN DE ALERTAS DEL SECURITY ADVISOR
-- ============================================

-- 1. search_path fijo (lint 0011)
alter function public.set_inventory_updated_at() set search_path = public, pg_temp;
alter function public.update_pricing_rules_updated_at() set search_path = public, pg_temp;
alter function public.check_inventory_stock_trigger() set search_path = public, pg_temp;
alter function public.get_user_role(uuid) set search_path = public, pg_temp;

-- 2. Funciones de stock: pasan a SECURITY INVOKER para que apliquen las
--    políticas RLS de inventory_items (antes cualquier usuario podía modificar
--    el inventario de cualquier sede).
alter function public.adjust_inventory_item_stock(uuid, numeric) security invoker;
alter function public.adjust_inventory_item_stock(uuid, numeric) set search_path = public, pg_temp;
alter function public.increment_inventory_stock(uuid, uuid, numeric) security invoker;
alter function public.increment_inventory_stock(uuid, uuid, numeric) set search_path = public, pg_temp;

-- 3. Funciones de trigger: no se llaman por RPC; los triggers siguen
--    funcionando sin privilegio EXECUTE (lints 0028/0029).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_inventory_stock_to_machine_tanks() from public, anon, authenticated;

-- 4. RPC de la app: solo usuarios autenticados (lint 0028).
revoke execute on function public.process_sale(jsonb) from public, anon;
revoke execute on function public.update_order_with_stock(jsonb) from public, anon;
revoke execute on function public.cancel_sale_with_stock_restore(uuid, text) from public, anon;
revoke execute on function public.adjust_inventory_item_stock(uuid, numeric) from public, anon;
revoke execute on function public.increment_inventory_stock(uuid, uuid, numeric) from public, anon;
grant execute on function public.process_sale(jsonb) to authenticated;
grant execute on function public.update_order_with_stock(jsonb) to authenticated;
grant execute on function public.cancel_sale_with_stock_restore(uuid, text) to authenticated;
grant execute on function public.adjust_inventory_item_stock(uuid, numeric) to authenticated;
grant execute on function public.increment_inventory_stock(uuid, uuid, numeric) to authenticated;

-- has_role, get_auth_store_id y get_user_role se mantienen ejecutables por anon
-- y authenticated: las usan políticas RLS que también se evalúan para anon
-- (p. ej. la lectura de stores en la pantalla de login).

-- 5. Políticas siempre verdaderas (lint 0024)
drop policy if exists "Permitir acceso a usuarios autenticados" on public.customer_profiles;
create policy "Customer profiles by store" on public.customer_profiles
  for all to authenticated
  using (
    id = auth.uid()
    or has_role(auth.uid(), 'super_admin')
    or exists (select 1 from public.profiles p where p.id = customer_profiles.id and p.store_id = get_auth_store_id())
  )
  with check (
    id = auth.uid()
    or has_role(auth.uid(), 'super_admin')
    or exists (select 1 from public.profiles p where p.id = customer_profiles.id and p.store_id = get_auth_store_id())
  );

drop policy if exists "Staff can create invoices" on public.invoices;
drop policy if exists "Staff can view invoices" on public.invoices;
create policy "Staff can create invoices" on public.invoices
  for insert to authenticated
  with check (
    has_role(auth.uid(), 'super_admin')
    or exists (select 1 from public.orders o where o.id = invoices.order_id and o.store_id = get_auth_store_id())
  );
create policy "Staff can view invoices" on public.invoices
  for select to authenticated
  using (
    has_role(auth.uid(), 'super_admin')
    or exists (select 1 from public.orders o where o.id = invoices.order_id and o.store_id = get_auth_store_id())
  );

-- 6. Buckets públicos: las URLs públicas no necesitan política SELECT.
--    Se mantiene SELECT para usuarios autenticados porque las subidas usan upsert.
drop policy if exists "Allow public read access to branding" on storage.objects;
drop policy if exists "Public Access" on storage.objects;
create policy "Authenticated read branding" on storage.objects
  for select to authenticated using (bucket_id = 'branding');
create policy "Authenticated read products" on storage.objects
  for select to authenticated using (bucket_id = 'products');
