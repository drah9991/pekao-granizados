#!/bin/bash
# Genera un bloque DO que aplica function_grants_hardening.sql DOS veces (prueba
# de idempotencia), corre function_grants_hardening.checks.sql y termina con
# RAISE EXCEPTION: Postgres revierte todo. Pega la salida en el editor SQL de
# staging (o envíala con execute_sql) y lee el mensaje RESULTADO.
#
# Uso: bash supabase/staging/build-grants-test.sh > /tmp/grants-test.sql

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

cat <<'SQL'
DO $t$
DECLARE
  s_a uuid := 'c72851e5-380d-4e1c-952b-34713638e70b';  -- sede A: SUCURSAL PRINCIPAL
  v_manager uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_admin uuid;
  v_product uuid;
  res text := '';
BEGIN
SQL
# Quitar comentarios de línea completa para que el bloque sea más corto.
grep -v '^[[:space:]]*--' "$DIR/function_grants_hardening.sql"
grep -v '^[[:space:]]*--' "$DIR/function_grants_hardening.sql"
grep -v '^[[:space:]]*--' "$DIR/function_grants_hardening.checks.sql"
cat <<'SQL'
END $t$;
SQL
