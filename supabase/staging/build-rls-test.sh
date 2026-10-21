#!/bin/bash
# Genera un bloque DO que aplica rls_lockdown.sql, corre rls_lockdown.checks.sql
# y termina con RAISE EXCEPTION: Postgres revierte todo. Pega la salida en el
# editor SQL de staging (o envíala con execute_sql) y lee el mensaje RESULTADO.
#
# Uso: bash supabase/staging/build-rls-test.sh > /tmp/rls-test.sql

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

cat <<'SQL'
DO $t$
DECLARE
  s_a uuid := 'c72851e5-380d-4e1c-952b-34713638e70b';  -- sede A: SUCURSAL PRINCIPAL
  s_b uuid := '252ded6a-21cb-4b8e-8e3d-89f7d74c3610';  -- sede B: CLICK & SNACK
  p_prod uuid := (SELECT id FROM public.products WHERE store_id = 'c72851e5-380d-4e1c-952b-34713638e70b' LIMIT 1);
  v_cashier uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_item_a uuid := gen_random_uuid();
  v_admin uuid;
  res text := '';
BEGIN
SQL
# Quitar comentarios de línea completa para que el bloque sea más corto.
grep -v '^[[:space:]]*--' "$DIR/rls_lockdown.sql"
grep -v '^[[:space:]]*--' "$DIR/rls_lockdown.checks.sql"
cat <<'SQL'
END $t$;
SQL
