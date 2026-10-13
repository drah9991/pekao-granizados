#!/bin/bash

# Reconstruye el esquema public de STAGING a partir del de PRODUCCIÓN
# y luego aplica las migraciones que aún no están en producción.
# Destructivo para staging: borra todas las tablas y datos del esquema public.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROD_PROJECT_ID="uznmoxeypmgkqesfuqhp"
STAGING_PROJECT_ID="llzdxcujvagctnzjymqh"

# Migraciones pendientes de llegar a producción, en orden de aplicación
PENDING_MIGRATIONS=(
    "supabase/migrations/20260923000000_add_rate_limiting.sql"
    "supabase/migrations/20261001000200_create_workflow_versions.sql"
    "supabase/migrations/20250131000001_add_exec_sql_function.sql"
)

echo -e "${GREEN}🚀 Reconstrucción de esquema STAGING desde PRODUCCIÓN${NC}"
echo "======================================================"
echo "Producción (solo lectura): $PROD_PROJECT_ID"
echo "Staging (se sobrescribe):  $STAGING_PROJECT_ID"

for migration in "${PENDING_MIGRATIONS[@]}"; do
    if [ ! -f "$migration" ]; then
        echo -e "${RED}❌ Error: no existe $migration${NC}"
        exit 1
    fi
done

# Validar dependencias de PostgreSQL
USE_DOCKER_POSTGRES=false
if ! command -v psql >/dev/null 2>&1 || ! command -v pg_dump >/dev/null 2>&1; then
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        USE_DOCKER_POSTGRES=true
        echo -e "${YELLOW}⚠️  psql/pg_dump no están instalados; se usará PostgreSQL mediante Docker${NC}"
    else
        echo -e "${RED}❌ Error: faltan psql/pg_dump y Docker no está disponible${NC}"
        echo "Inicia Docker Desktop o instala PostgreSQL Client 17 y vuelve a ejecutar."
        exit 1
    fi
fi

echo -e "${YELLOW}⚠️  Se borrarán TODAS las tablas y datos del esquema public de STAGING${NC}"
read -p "Escribe el ID del proyecto de staging para confirmar: " confirm

if [ "$confirm" != "$STAGING_PROJECT_ID" ]; then
    echo -e "${RED}❌ Reconstrucción cancelada${NC}"
    exit 0
fi

read -sp "Contraseña de la base de datos de PRODUCCIÓN: " PROD_DB_PASSWORD
echo ""
read -sp "Contraseña de la base de datos de STAGING: " STAGING_DB_PASSWORD
echo ""

# pg_client <password> <project_id> <tool> [args...]
pg_client() {
    local password="$1" project_id="$2" tool="$3"
    shift 3
    if [ "$USE_DOCKER_POSTGRES" = true ]; then
        docker run --rm -i -e "PGPASSWORD=$password" postgres:17-alpine \
            "$tool" -h "db.${project_id}.supabase.co" -p 5432 -U postgres -d postgres "$@"
    else
        PGPASSWORD="$password" "$tool" -h "db.${project_id}.supabase.co" -p 5432 -U postgres -d postgres "$@"
    fi
}

prod() { pg_client "$PROD_DB_PASSWORD" "$PROD_PROJECT_ID" "$@"; }
staging() { pg_client "$STAGING_DB_PASSWORD" "$STAGING_PROJECT_ID" "$@"; }

mkdir -p backups
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="backups/staging-pre-rebuild-$TIMESTAMP.sql"
SCHEMA_FILE="backups/production-schema-$TIMESTAMP.sql"
REBUILD_FILE="backups/staging-rebuild-$TIMESTAMP.sql"

echo -e "${GREEN}📦 Creando backup de staging...${NC}"
if ! staging pg_dump --schema=public > "$BACKUP_FILE"; then
    echo -e "${RED}❌ No se pudo crear el backup de staging; no se modificó nada${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"

echo -e "${GREEN}📥 Exportando esquema de producción (sin datos)...${NC}"
if ! prod pg_dump --schema-only --schema=public --no-owner > "$SCHEMA_FILE"; then
    echo -e "${RED}❌ No se pudo exportar el esquema de producción; no se modificó nada${NC}"
    exit 1
fi

# Triggers sobre tablas de auth que llaman a funciones de public (p. ej. alta de usuarios)
AUTH_TRIGGERS="$(prod psql -At -v ON_ERROR_STOP=1 -c "
    select format('drop trigger if exists %I on %I.%I;', t.tgname, n.nspname, c.relname)
           || E'\n' || pg_get_triggerdef(t.oid) || ';'
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace pn on pn.oid = p.pronamespace
    where not t.tgisinternal and n.nspname = 'auth' and pn.nspname = 'public';")"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ No se pudieron leer los triggers de auth en producción; no se modificó nada${NC}"
    exit 1
fi

{
    echo "drop schema if exists public cascade;"
    echo "create schema public;"
    # El dump puede incluir el schema y su comentario, que ya se crearon arriba
    grep -vE '^(CREATE SCHEMA public;|COMMENT ON SCHEMA public )' "$SCHEMA_FILE"
    echo "$AUTH_TRIGGERS"
    cat <<'SQL'
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to postgres, anon, authenticated, service_role;
SQL
    for migration in "${PENDING_MIGRATIONS[@]}"; do
        echo "-- >>> $migration"
        cat "$migration"
        echo ""
    done
} > "$REBUILD_FILE"

echo -e "${GREEN}🔧 Aplicando en staging (una sola transacción)...${NC}"
if ! staging psql -v ON_ERROR_STOP=1 --single-transaction -q < "$REBUILD_FILE"; then
    echo -e "${RED}❌ Falló la reconstrucción; la transacción se revirtió y staging quedó como estaba${NC}"
    echo "Script aplicado: $REBUILD_FILE"
    exit 1
fi
echo -e "${GREEN}✅ Esquema reconstruido${NC}"

echo -e "${GREEN}🔍 Verificando...${NC}"
staging psql -c "
    select (select count(*) from pg_tables where schemaname = 'public') as tablas,
           (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity) as tablas_sin_rls,
           (select count(*) from pg_policies where schemaname = 'public') as politicas,
           has_function_privilege('anon', 'public.exec_sql(text)', 'execute') as exec_sql_abierta;"

echo -e "${YELLOW}ℹ️  Staging quedó sin datos: carga datos de prueba con scripts/import-to-staging.sh${NC}"
echo -e "${YELLOW}ℹ️  Los usuarios existentes en auth.users no tienen perfil hasta que lo crees${NC}"
