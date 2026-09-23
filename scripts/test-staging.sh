#!/bin/bash

echo "🧪 Suite Completa de Tests - STAGING"
echo "===================================="

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Contador de tests
PASSED=0
FAILED=0

# Función para ejecutar y contar tests
run_test() {
    local test_name=$1
    local test_command=$2

    echo -e "\n${YELLOW}▶ $test_name${NC}"
    echo "----------------------------------------"

    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
}

# Verificar entorno
if [ ! -f .env.staging ]; then
    echo -e "${RED}❌ .env.staging no encontrado${NC}"
    exit 1
fi

# 1. Tests Unitarios
run_test "Tests Unitarios (Vitest)" "npm run test -- --run"

# 2. Lint
run_test "ESLint" "npm run lint"

# 3. TypeScript Check
run_test "TypeScript Type Check" "npx tsc --noEmit"

# 4. Build Staging
run_test "Build Staging" "npm run build:staging"

# 5. Test Rate Limiting (requiere DB staging configurada)
if command -v node &> /dev/null; then
    run_test "Rate Limiting Tests" "node scripts/test-rate-limiting.js"
else
    echo -e "${YELLOW}⚠️  Node no disponible, saltando rate limiting tests${NC}"
fi

# 6. Tests E2E (si Playwright está instalado y staging deployado)
if command -v playwright &> /dev/null; then
    if [ -n "$VITE_E2E_BASE_URL" ]; then
        run_test "Tests E2E (Playwright)" "npm run test:e2e"
    else
        echo -e "${YELLOW}⚠️  VITE_E2E_BASE_URL no configurado, saltando E2E${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Playwright no instalado, saltando E2E tests${NC}"
fi

# 7. Bundle Size Check
if [ -d "dist" ]; then
    echo -e "\n${YELLOW}▶ Bundle Size Check${NC}"
    echo "----------------------------------------"

    TOTAL_SIZE=$(du -sh dist | cut -f1)
    JS_SIZE=$(find dist -name "*.js" -exec du -ch {} + | tail -1 | cut -f1)
    CSS_SIZE=$(find dist -name "*.css" -exec du -ch {} + | tail -1 | cut -f1)

    echo "Total: $TOTAL_SIZE"
    echo "JS: $JS_SIZE"
    echo "CSS: $CSS_SIZE"

    # Verificar que JS no sea mayor a 1MB (ajustar según necesidad)
    JS_SIZE_BYTES=$(find dist -name "*.js" -exec du -b {} + | awk '{sum+=$1} END {print sum}')
    if [ $JS_SIZE_BYTES -lt 1000000 ]; then
        echo -e "${GREEN}✅ Bundle size OK${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ Bundle size muy grande (>1MB)${NC}"
        ((FAILED++))
    fi
fi

# Resumen
echo -e "\n========================================"
echo -e "📊 RESUMEN DE TESTS"
echo -e "========================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 TODOS LOS TESTS PASARON!${NC}"
    echo -e "${GREEN}✅ Staging está listo para deployment${NC}"
    exit 0
else
    echo -e "\n${RED}❌ ALGUNOS TESTS FALLARON${NC}"
    echo -e "${RED}Por favor revisa los errores antes de deployar${NC}"
    exit 1
fi
