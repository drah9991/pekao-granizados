#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Script de Migración a STAGING - Pekao Granizados${NC}"
echo "=================================================="

# Verificar que existe .env.staging
if [ ! -f .env.staging ]; then
    echo -e "${RED}❌ Error: .env.staging no encontrado${NC}"
    echo "Por favor crea el archivo .env.staging con las variables necesarias"
    exit 1
fi

# Cargar variables sin depender de shell nativo
load_env_file() {
    local env_file="$1"
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}❌ Error: $env_file no encontrado${NC}"
        exit 1
    fi

    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ''|\#*)
                continue
                ;;
        esac

        local key="${line%%=*}"
        local value="${line#*=}"

        if [ -z "$key" ]; then
            continue
        fi

        value="${value#\'}"
        value="${value%\'}"
        value="${value#\"}"
        value="${value%\"}"

        export "$key=$value"
    done < "$env_file"
}

load_env_file .env.staging

# Validar dependencias de PostgreSQL
USE_DOCKER_POSTGRES=false
if ! command -v psql >/dev/null 2>&1 || ! command -v pg_dump >/dev/null 2>&1; then
    if command -v docker >/dev/null 2>&1; then
        USE_DOCKER_POSTGRES=true
        echo -e "${YELLOW}⚠️  psql/pg_dump no están instalados; se usará PostgreSQL mediante Docker${NC}"
    else
    echo -e "${RED}❌ Error: faltan las herramientas de PostgreSQL (psql/pg_dump)${NC}"
    echo "Instala PostgreSQL Client en tu sistema antes de continuar:"
    echo "- macOS: brew install postgresql"
    echo "- Ubuntu/Debian: sudo apt-get install postgresql-client"
    echo "- Windows: instala PostgreSQL y agrega el directorio bin al PATH"
    exit 1
    fi
fi

# Solicitar confirmación
echo -e "${YELLOW}⚠️  Estás a punto de aplicar migraciones a STAGING${NC}"
echo "Supabase URL: $VITE_SUPABASE_URL"
read -p "¿Continuar? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Migración cancelada${NC}"
    exit 0
fi

# Construir URL de conexión
# Nota: Debes reemplazar [PASSWORD] con la contraseña real
read -sp "Ingresa la contraseña de la base de datos staging: " DB_PASSWORD
echo ""

PROJECT_ID=$(echo $VITE_SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')
STAGING_DB_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/postgres"

run_pg_dump() {
    if [ "$USE_DOCKER_POSTGRES" = true ]; then
        docker run --rm -i -e "PGPASSWORD=$DB_PASSWORD" postgres:17-alpine \
            pg_dump -h "db.${PROJECT_ID}.supabase.co" -p 5432 -U postgres -d postgres
    else
        pg_dump "$STAGING_DB_URL"
    fi
}

run_psql() {
    if [ "$USE_DOCKER_POSTGRES" = true ]; then
        docker run --rm -i -e "PGPASSWORD=$DB_PASSWORD" postgres:17-alpine \
            psql -h "db.${PROJECT_ID}.supabase.co" -p 5432 -U postgres -d postgres "$@"
    else
        psql "$STAGING_DB_URL" "$@"
    fi
}

echo -e "${GREEN}📦 Creando backup antes de migración...${NC}"
BACKUP_FILE="backups/staging-pre-migration-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p backups
run_pg_dump > "$BACKUP_FILE" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo crear backup (puede ser problema de conexión)${NC}"
    read -p "¿Continuar sin backup? (yes/no): " continue_no_backup
    if [ "$continue_no_backup" != "yes" ]; then
        exit 1
    fi
fi

echo -e "${GREEN}📝 Aplicando migración: Rate Limiting${NC}"
run_psql < supabase/migrations/20260923000000_add_rate_limiting.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migración aplicada exitosamente${NC}"
else
    echo -e "${RED}❌ Error al aplicar migración${NC}"
    exit 1
fi

echo -e "${GREEN}🔍 Verificando instalación...${NC}"

# Verificar tabla
echo "Verificando tabla login_attempts..."
run_psql -c "SELECT COUNT(*) as table_exists FROM pg_tables WHERE tablename = 'login_attempts';" | grep -q "1"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tabla login_attempts creada${NC}"
else
    echo -e "${RED}❌ Tabla login_attempts no encontrada${NC}"
fi

# Verificar funciones
echo "Verificando funciones..."
FUNCTIONS=("is_account_locked" "record_login_attempt" "get_lockout_remaining_time" "clear_login_attempts")

for func in "${FUNCTIONS[@]}"; do
    run_psql -c "SELECT proname FROM pg_proc WHERE proname = '$func';" | grep -q "$func"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Función $func creada${NC}"
    else
        echo -e "${RED}  ❌ Función $func no encontrada${NC}"
    fi
done

# Verificar índices
echo "Verificando índices..."
INDEXES=("idx_login_attempts_email" "idx_login_attempts_ip" "idx_login_attempts_time")

for idx in "${INDEXES[@]}"; do
    run_psql -c "SELECT indexname FROM pg_indexes WHERE indexname = '$idx';" | grep -q "$idx"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Índice $idx creado${NC}"
    else
        echo -e "${RED}  ❌ Índice $idx no encontrado${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Migración completada!${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Ejecutar tests: npm run test"
echo "2. Deploy a staging: npm run build:staging"
echo "3. Test manual de rate limiting"
echo ""
echo "En caso de problemas, ejecutar rollback:"
echo "psql \"\$STAGING_DB_URL\" < supabase/migrations/20260923000000_rollback_rate_limiting.sql"
