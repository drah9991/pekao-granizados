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
  s_a uuid := '8cfcf12f-196f-43ac-a240-6976b7044de7';  -- sede A (staging)
  s_b uuid := 'c1b3c246-cba3-432b-a2fc-2ec37715d4fe';  -- sede B (staging)
  p_mora uuid := '8b1c7e93-72d9-416c-82cf-5ae34a28ec58';
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
