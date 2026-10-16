-- ============================================
-- MAESTRO DEL ASISTENTE IA (chatbot) POR SEDE
-- ============================================

-- Parámetros visibles para el personal de la sede
create table if not exists public.chatbot_settings (
  store_id        uuid primary key references public.stores(id) on delete cascade,
  enabled         boolean not null default false,
  model           text not null default 'gpt-4o-mini',
  system_prompt   text not null default 'Eres el Asistente Inteligente de Pekao Central, un sistema de Punto de Venta e Inventario para heladerías y tiendas de granizados. Ayuda de forma amigable y concisa a dueños y cajeros con dudas de ventas, inventario y cuadres de caja. No inventes funcionalidades.',
  welcome_message text not null default '¡Hola! Soy el asistente virtual de Pekao Central. ¿En qué te puedo ayudar hoy con tu punto de venta o inventario?',
  temperature     numeric(3,2) not null default 0.7 check (temperature between 0 and 2),
  max_tokens      integer not null default 500 check (max_tokens between 50 and 4000),
  api_key_hint    text,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id) on delete set null
);

alter table public.chatbot_settings enable row level security;

create policy "Staff can read chatbot settings of their store" on public.chatbot_settings
  for select to authenticated
  using (store_id in (select p.store_id from public.profiles p where p.id = auth.uid()));

create policy "Admins can manage chatbot settings of their store" on public.chatbot_settings
  for all to authenticated
  using (
    store_id in (select p.store_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.user_roles ur
                where ur.user_id = auth.uid() and ur.role::text in ('admin', 'manager', 'super_admin'))
  )
  with check (
    store_id in (select p.store_id from public.profiles p where p.id = auth.uid())
    and exists (select 1 from public.user_roles ur
                where ur.user_id = auth.uid() and ur.role::text in ('admin', 'manager', 'super_admin'))
  );

-- Clave del proveedor: sin políticas, solo la lee service_role (la ruta /api/chat)
create table if not exists public.chatbot_secrets (
  store_id   uuid primary key references public.stores(id) on delete cascade,
  api_key    text not null,
  updated_at timestamptz not null default now()
);

alter table public.chatbot_secrets enable row level security;
revoke all on public.chatbot_secrets from anon, authenticated;

-- Guardar o borrar la clave desde la interfaz sin poder leerla nunca
create or replace function public.set_chatbot_api_key(p_store_id uuid, p_api_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text := nullif(trim(p_api_key), '');
begin
  if not exists (
    select 1 from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.id = auth.uid()
      and p.store_id = p_store_id
      and ur.role::text in ('admin', 'manager', 'super_admin')
  ) then
    raise exception 'No autorizado para configurar el asistente de esta sede' using errcode = '42501';
  end if;

  if v_key is null then
    delete from public.chatbot_secrets where store_id = p_store_id;
    update public.chatbot_settings
      set api_key_hint = null, updated_at = now(), updated_by = auth.uid()
      where store_id = p_store_id;
    return;
  end if;

  insert into public.chatbot_secrets (store_id, api_key)
    values (p_store_id, v_key)
    on conflict (store_id) do update set api_key = excluded.api_key, updated_at = now();

  insert into public.chatbot_settings (store_id, api_key_hint, updated_by)
    values (p_store_id, right(v_key, 4), auth.uid())
    on conflict (store_id) do update
      set api_key_hint = excluded.api_key_hint, updated_at = now(), updated_by = auth.uid();
end;
$$;

revoke execute on function public.set_chatbot_api_key(uuid, text) from public, anon;
grant execute on function public.set_chatbot_api_key(uuid, text) to authenticated;
