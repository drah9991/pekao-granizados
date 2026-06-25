-- 20261001000200_create_workflow_versions.sql
-- Tabla para versionar los diagramas de flujo
create table public.workflow_versions (
  id            bigint generated always as identity primary key,
  workflow_id   bigint references public.workflows(id) on delete cascade not null,
  definition    jsonb not null,
  created_at    timestamp default now() not null
);

-- RLS: solo el propietario del workflow puede ver sus versiones
alter table public.workflow_versions enable row level security;
create policy "owner can read versions" on public.workflow_versions
  for select
  using (auth.uid() = (
    select user_id from public.workflows where id = workflow_id
  ));
