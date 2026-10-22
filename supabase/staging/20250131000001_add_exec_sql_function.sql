-- ============================================
-- FUNCIÓN DE UTILIDAD: exec_sql
-- ============================================
-- Necesaria para scripts de migración automatizados
-- Permite ejecutar SQL dinámico desde aplicaciones externas

create or replace function public.exec_sql(sql_query text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  execute sql_query;
  return json_build_object('success', true, 'executed_at', now());
exception when others then
  raise warning 'exec_sql error: %', SQLERRM;
  return json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE);
end;
$$;

-- Permisos: Solo service_role puede usar esta función
revoke all on function public.exec_sql(text) from public, anon, authenticated;
grant execute on function public.exec_sql(text) to service_role;

comment on function public.exec_sql is 'Ejecuta SQL dinámico - Solo para service_role en scripts de migración';
