#!/bin/bash
set -e

# Load production environment variables
source .env

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/production_export_${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "🔄 Exportando datos de producción..."
echo "📁 Directorio: $BACKUP_DIR"
echo ""

# Database connection from .env
DB_HOST="db.uznmoxeypmgkqesfuqhp.supabase.co"
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="5432"

# Extract password from .env
DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: No se encontró SUPABASE_DB_PASSWORD en .env"
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

# Tables to export (in dependency order)
TABLES=(
  "categories"
  "products"
  "product_customization"
  "inventory"
  "suppliers"
)

echo "📊 Exportando tablas principales..."
for table in "${TABLES[@]}"; do
  echo "  - Exportando $table..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "\COPY (SELECT * FROM public.$table) TO STDOUT WITH CSV HEADER" \
    > "$BACKUP_DIR/${table}.csv" 2>/dev/null || {
      echo "    ⚠️  Tabla $table no existe o está vacía, continuando..."
    }
done

# Get row counts
echo ""
echo "📈 Resumen de exportación:"
for table in "${TABLES[@]}"; do
  if [ -f "$BACKUP_DIR/${table}.csv" ]; then
    COUNT=$(tail -n +2 "$BACKUP_DIR/${table}.csv" | wc -l)
    echo "  - $table: $COUNT registros"
  fi
done

unset PGPASSWORD

echo ""
echo "✅ Exportación completada: $BACKUP_DIR"
echo ""
echo "🔄 Siguiente paso: bash scripts/import-to-staging.sh $BACKUP_DIR"
