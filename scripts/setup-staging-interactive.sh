#!/bin/bash

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ASISTENTE DE CONFIGURACIÓN DE STAGING - Pekao Granizados POS             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para pausar y esperar input
pause() {
    echo ""
    read -p "Presiona ENTER para continuar..."
    echo ""
}

# WSL no siempre hereda las rutas de Windows. Usa Node.js de Windows si es la
# instalación disponible, invocando npm mediante cmd.exe.
NODE_BIN="node"
USE_WINDOWS_NPM=false
if ! command -v node &> /dev/null; then
    if command -v node.exe &> /dev/null; then
        NODE_BIN="node.exe"
    else
        WINDOWS_NODE=$(find /mnt/c/Users -path '*/AppData/Local/studio/bin/node.exe' -type f -print -quit 2>/dev/null)
        if [ -n "$WINDOWS_NODE" ] && [ -x "$WINDOWS_NODE" ]; then
            NODE_BIN="$WINDOWS_NODE"
        fi
    fi
fi

run_npm() {
    if [ "$USE_WINDOWS_NPM" = true ]; then
        cmd.exe /c npm "$@"
    else
        npm "$@"
    fi
}

# PASO 1: Verificar prerrequisitos
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 0: Verificando prerrequisitos...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar Node
if [ "$NODE_BIN" != "node" ] || command -v node &> /dev/null; then
    NODE_VERSION=$("$NODE_BIN" -v)
    echo -e "${GREEN}✅ Node.js instalado: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js no encontrado. Por favor instala Node.js 18 o superior.${NC}"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null && NPM_VERSION=$(npm -v 2>/dev/null) && [ -n "$NPM_VERSION" ]; then
    echo -e "${GREEN}✅ npm instalado: $NPM_VERSION${NC}"
elif [ "$NODE_BIN" != "node" ] && command -v cmd.exe &> /dev/null; then
    USE_WINDOWS_NPM=true
    NPM_VERSION=$(run_npm -v)
    echo -e "${GREEN}✅ npm de Windows instalado: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm no encontrado.${NC}"
    exit 1
fi

# Verificar git
if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ Git instalado${NC}"
else
    echo -e "${YELLOW}⚠️  Git no encontrado (opcional)${NC}"
fi

pause

# PASO 1: Información de Supabase
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 1: Proyecto Supabase Staging${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Si AÚN NO has creado el proyecto:"
echo "1. Ve a: https://supabase.com/dashboard"
echo "2. Click en 'New Project'"
echo "3. Nombre: pekao-granizados-staging"
echo "4. Guarda la contraseña de la base de datos"
echo "5. Espera 2-3 minutos a que se cree"
echo "6. Ve a Settings > API y copia las credenciales"
echo ""
read -p "¿Ya tienes el proyecto creado? (s/n): " TIENE_PROYECTO

if [ "$TIENE_PROYECTO" != "s" ]; then
    echo ""
    echo -e "${YELLOW}⏸️  Pausa aquí. Crea el proyecto primero.${NC}"
    echo "Ejecuta este script nuevamente cuando esté listo."
    exit 0
fi

# PASO 2: Capturar credenciales
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 2: Configurar Variables de Entorno${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Verificar si ya existe .env.staging
if [ -f ".env.staging" ]; then
    echo -e "${YELLOW}⚠️  .env.staging ya existe${NC}"
    read -p "¿Deseas sobrescribirlo? (s/n): " SOBRESCRIBIR
    if [ "$SOBRESCRIBIR" != "s" ]; then
        echo "Usando .env.staging existente"
        pause
    else
        rm .env.staging
    fi
fi

if [ ! -f ".env.staging" ]; then
    echo "Por favor ingresa las credenciales de Supabase:"
    echo ""

    read -p "VITE_SUPABASE_URL (https://xxxxx.supabase.co): " SUPABASE_URL
    echo ""

    read -p "VITE_SUPABASE_ANON_KEY (eyJ...): " SUPABASE_ANON_KEY
    echo ""

    read -p "Email para tests E2E (ej: admin@staging.test): " TEST_EMAIL
    echo ""

    read -sp "Password para tests E2E: " TEST_PASSWORD
    echo ""
    echo ""

    # Crear archivo .env.staging
    cat > .env.staging <<EOF
# Supabase Staging
VITE_SUPABASE_URL='$SUPABASE_URL'
VITE_SUPABASE_ANON_KEY='$SUPABASE_ANON_KEY'

# Environment
VITE_ENV=staging

# Feature Flags
VITE_ENABLE_RATE_LIMITING=true
VITE_ENABLE_OFFLINE_SYNC=true
VITE_ENABLE_ERROR_BOUNDARIES=true

# Testing
VITE_E2E_BASE_URL=http://localhost:5173
TEST_EMAIL='$TEST_EMAIL'
TEST_PASSWORD='$TEST_PASSWORD'

# Performance
VITE_BUNDLE_ANALYZE=false
VITE_DEBUG_MODE=true
VITE_SOURCE_MAPS=true

# Staging Banner
VITE_SHOW_STAGING_BANNER=true
VITE_STAGING_MESSAGE='Entorno de Pruebas - No usar en producción'
EOF

    echo -e "${GREEN}✅ Archivo .env.staging creado${NC}"
fi

pause

# PASO 3: Instalar dependencias
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 3: Instalar Dependencias${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules ya existe${NC}"
    read -p "¿Deseas reinstalar dependencias? (s/n): " REINSTALAR
    if [ "$REINSTALAR" == "s" ]; then
        echo "Instalando dependencias..."
        run_npm install --legacy-peer-deps
    fi
else
    echo "Instalando dependencias..."
    run_npm install --legacy-peer-deps
fi

echo -e "${GREEN}✅ Dependencias instaladas${NC}"
pause

# PASO 4: Aplicar migraciones
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 4: Aplicar Migraciones a Base de Datos${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Vamos a aplicar la migración de Rate Limiting."
echo ""
read -p "¿Continuar con la migración? (s/n): " APLICAR_MIGRACION

if [ "$APLICAR_MIGRACION" == "s" ]; then
    echo ""
    echo "OPCIÓN 1: Manual (Recomendado para primera vez)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Ve a tu proyecto en Supabase Dashboard"
    echo "2. Click en 'SQL Editor' en el menú lateral"
    echo "3. Click en 'New Query'"
    echo "4. Abre: supabase/migrations/20260923000000_add_rate_limiting.sql"
    echo "5. Copia todo el contenido"
    echo "6. Pégalo en el editor SQL de Supabase"
    echo "7. Click en 'Run' (botón verde)"
    echo "8. Verifica que dice 'Success' sin errores"
    echo ""
    echo "OPCIÓN 2: Script automatizado (requiere psql)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "npm run staging:migrate"
    echo ""

    read -p "¿Ya aplicaste la migración? (s/n): " MIGRACION_APLICADA

    if [ "$MIGRACION_APLICADA" == "s" ]; then
        echo -e "${GREEN}✅ Migración aplicada${NC}"
    else
        echo -e "${YELLOW}⚠️  Recuerda aplicar la migración antes de continuar${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Migración omitida. Rate limiting no funcionará.${NC}"
fi

pause

# PASO 5: Ejecutar tests
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 5: Ejecutar Tests${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "¿Deseas ejecutar los tests ahora? (s/n): " EJECUTAR_TESTS

if [ "$EJECUTAR_TESTS" == "s" ]; then
    echo ""
    echo "Ejecutando tests unitarios..."
    run_npm run test -- --run

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Tests unitarios pasaron${NC}"
    else
        echo -e "${RED}❌ Tests unitarios fallaron${NC}"
        echo "Revisa los errores arriba"
    fi

    pause

    echo "¿Deseas ejecutar tests E2E? (requiere más tiempo)"
    read -p "(s/n): " EJECUTAR_E2E

    if [ "$EJECUTAR_E2E" == "s" ]; then
        echo "Instalando navegadores de Playwright..."
        run_npm run playwright:install

        echo "Ejecutando tests E2E..."
        run_npm run test:e2e

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Tests E2E pasaron${NC}"
        else
            echo -e "${RED}❌ Tests E2E fallaron${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Tests omitidos${NC}"
fi

pause

# PASO 6: Build staging
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 6: Build de Staging${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "¿Deseas hacer el build ahora? (s/n): " HACER_BUILD

if [ "$HACER_BUILD" == "s" ]; then
    echo "Construyendo aplicación..."
    run_npm run build:staging

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Build exitoso${NC}"

        # Mostrar tamaño del bundle
        if [ -d "dist" ]; then
            echo ""
            echo "Tamaño del bundle:"
            du -sh dist
        fi
    else
        echo -e "${RED}❌ Build falló${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Build omitido${NC}"
fi

pause

# PASO 7: Deploy
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  PASO 7: Deploy a Staging${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Opciones de deployment:"
echo ""
echo "1. Vercel (Recomendado)"
echo "   vercel --env staging"
echo ""
echo "2. Netlify"
echo "   netlify deploy --build --context=staging"
echo ""
echo "3. Preview local"
echo "   npm run preview:staging"
echo ""
read -p "¿Qué opción prefieres? (1/2/3/n para omitir): " OPCION_DEPLOY

case $OPCION_DEPLOY in
    1)
        if command -v vercel &> /dev/null; then
            echo "Deploying a Vercel..."
            vercel --env staging
        else
            echo -e "${YELLOW}⚠️  Vercel CLI no instalado${NC}"
            echo "Instala con: npm i -g vercel"
        fi
        ;;
    2)
        if command -v netlify &> /dev/null; then
            echo "Deploying a Netlify..."
            netlify deploy --build --context=staging
        else
            echo -e "${YELLOW}⚠️  Netlify CLI no instalado${NC}"
            echo "Instala con: npm i -g netlify-cli"
        fi
        ;;
    3)
        echo "Iniciando preview local..."
        echo "Abriendo en http://localhost:4173"
        run_npm run preview:staging &
        sleep 2

        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:4173
        elif command -v open &> /dev/null; then
            open http://localhost:4173
        else
            echo "Abre manualmente: http://localhost:4173"
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠️  Deploy omitido${NC}"
        ;;
esac

pause

# RESUMEN FINAL
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 CONFIGURACIÓN COMPLETADA                                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📝 RESUMEN:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar qué se completó
[ -f ".env.staging" ] && echo "✅ Variables de entorno configuradas" || echo "❌ Variables de entorno pendientes"
[ -d "node_modules" ] && echo "✅ Dependencias instaladas" || echo "❌ Dependencias pendientes"
[ -d "dist" ] && echo "✅ Build completado" || echo "⚠️  Build pendiente"

echo ""
echo "📚 PRÓXIMOS PASOS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Si no aplicaste la migración, hazlo ahora:"
echo "   Supabase Dashboard > SQL Editor > Ejecutar el contenido de:"
echo "   supabase/migrations/20260923000000_add_rate_limiting.sql"
echo ""
echo "2. Verifica que rate limiting funciona:"
echo "   npm run staging:test-rate-limit"
echo ""
echo "3. Deploy (si no lo hiciste):"
echo "   vercel --env staging"
echo ""
echo "4. Validación manual (checklist en STAGING_SETUP.md):"
echo "   - Login funciona ✓"
echo "   - Rate limiting bloquea después de 5 intentos ✓"
echo "   - POS procesa ventas ✓"
echo "   - Offline sync funciona ✓"
echo ""
echo "5. Monitoreo por 48 horas antes de producción"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 DOCUMENTACIÓN:"
echo "   - IMPLEMENTACION_STAGING.md    ← Guía completa"
echo "   - FAQ_TROUBLESHOOTING.md       ← Solución de problemas"
echo "   - ARQUITECTURA_VISUAL.md       ← Diagramas"
echo ""
echo "💡 COMANDOS ÚTILES:"
echo "   npm run test                    # Tests unitarios"
echo "   npm run test:e2e               # Tests E2E"
echo "   npm run build:staging          # Build"
echo "   npm run preview:staging        # Preview local"
echo "   npm run staging:migrate        # Migraciones"
echo ""
echo -e "${GREEN}¡Listo! Tu entorno de staging está configurado. 🚀${NC}"
echo ""
