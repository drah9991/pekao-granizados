#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "❌ Error: Debes especificar el directorio de backup"
  echo "Uso: bash scripts/import-to-staging.sh <directorio_backup>"
  exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Error: El directorio $BACKUP_DIR no existe"
  exit 1
fi

# Load staging environment variables
source .env.staging

echo "🔄 Importando datos a staging desde: $BACKUP_DIR"
echo ""

# Database connection from .env.staging
DB_HOST="db.llzdxcujvagctnzjymqh.supabase.co"
DB_NAME="postgres"
DB_USER="postgres"
DB_PORT="5432"

# Extract password from .env.staging
DB_PASSWORD=$(grep SUPABASE_DB_PASSWORD .env.staging | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: No se encontró SUPABASE_DB_PASSWORD en .env.staging"
  exit 1
fi

export PGPASSWORD="$DB_PASSWORD"

# Tables to import (in dependency order)
TABLES=(
  "categories"
  "products"
  "product_customization"
  "inventory"
  "suppliers"
)

echo "🗑️  Limpiando datos existentes en staging..."
for table in "${TABLES[@]}"; do
  echo "  - Truncando $table..."
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "TRUNCATE TABLE public.$table RESTART IDENTITY CASCADE;" 2>/dev/null || {
      echo "    ⚠️  No se pudo truncar $table, continuando..."
    }
done

echo ""
echo "📥 Importando datos..."
for table in "${TABLES[@]}"; do
  CSV_FILE="$BACKUP_DIR/${table}.csv"

  if [ -f "$CSV_FILE" ]; then
    COUNT=$(tail -n +2 "$CSV_FILE" | wc -l)
    if [ "$COUNT" -gt 0 ]; then
      echo "  - Importando $table ($COUNT registros)..."
      psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -c "\COPY public.$table FROM '$CSV_FILE' WITH CSV HEADER" 2>/dev/null || {
          echo "    ❌ Error importando $table"
        }
    else
      echo "  - Saltando $table (vacío)"
    fi
  else
    echo "  - Saltando $table (archivo no encontrado)"
  fi
done

unset PGPASSWORD

echo ""
echo "✅ Importación completada"
echo ""
echo "🔍 Verifica los datos en: https://supabase.com/dashboard/project/llzdxcujvagctnzjymqh"
