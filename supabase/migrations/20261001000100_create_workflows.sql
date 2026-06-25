-- 20261001000100_create_workflows.sql
-- Tabla para almacenar diagramas de flujo (workflows)
create table public.workflows (
  id            bigint generated always as identity primary key,
  user_id       uuid references auth.users(id) not null,
  name          text not null,
  definition    jsonb not null,
  created_at    timestamp default now() not null
);

-- Política RLS: solo el propietario puede acceder/editar su workflow
alter table public.workflows enable row level security;
create policy "owner can CRUD" on public.workflows
  for all
  using (auth.uid() = user_id);
