#!/bin/bash
# Genera un bloque DO que aplica align_schema.sql DOS veces (prueba de
# idempotencia), corre align_schema.checks.sql y termina con RAISE EXCEPTION:
# Postgres revierte todo. Pega la salida en el editor SQL de staging (o envíala
# con execute_sql) y lee el mensaje RESULTADO.
#
# Uso: bash supabase/staging/build-align-test.sh > /tmp/align-test.sql

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

cat <<'SQL'
DO $t$
DECLARE
  s_a uuid := '8cfcf12f-196f-43ac-a240-6976b7044de7';  -- sede A (staging)
  s_b uuid := 'c1b3c246-cba3-432b-a2fc-2ec37715d4fe';  -- sede B (staging)
  v_cashier uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_txt text;
  res text := '';
BEGIN
SQL
# Quitar comentarios de línea completa para que el bloque sea más corto.
grep -v '^[[:space:]]*--' "$DIR/align_schema.sql"
grep -v '^[[:space:]]*--' "$DIR/align_schema.sql"
grep -v '^[[:space:]]*--' "$DIR/align_schema.checks.sql"
cat <<'SQL'
END $t$;
SQL
