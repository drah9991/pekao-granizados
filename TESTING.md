# Pekao Granizados POS - Testing Guide

## 📋 Tabla de Contenidos
- [Configuración](#configuración)
- [Tests Unitarios](#tests-unitarios)
- [Tests E2E](#tests-e2e)
- [CI/CD](#cicd)
- [Cobertura](#cobertura)

## 🛠️ Configuración

### Instalación
```bash
# Instalar dependencias
npm install

# Instalar navegadores de Playwright
npm run playwright:install
```

### Variables de Entorno para Tests
Crea un archivo `.env.test`:
```env
TEST_EMAIL=test@pekao.com
TEST_PASSWORD=test123456
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## 🧪 Tests Unitarios

### Ejecutar tests
```bash
# Modo watch
npm run test

# Ejecutar una vez
npm run test -- --run

# Con interfaz UI
npm run test:ui

# Con cobertura
npm run test:coverage
```

### Tests Críticos Implementados

#### `useCart.test.ts`
- ✅ Cálculo de subtotal
- ✅ Descuentos (porcentaje y fijo)
- ✅ Actualización de cantidades
- ✅ Eliminación de items
- ✅ Reset del carrito
- ✅ Múltiples items con diferentes precios

**Cobertura objetivo**: 80% en hooks críticos

### Escribir nuevos tests

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInventory } from '../useInventory';

describe('useInventory', () => {
  it('should update stock correctly', () => {
    const { result } = renderHook(() => useInventory());
    
    act(() => {
      result.current.updateStock('item-1', 50);
    });

    expect(result.current.stock['item-1']).toBe(50);
  });
});
```

## 🎭 Tests E2E (End-to-End)

### Ejecutar tests E2E
```bash
# Headless (CI)
npm run test:e2e

# Con interfaz visual
npm run test:e2e:headed

# Modo interactivo
npm run test:e2e:ui
```

### Tests E2E Implementados

#### `pos-sale-flow.spec.ts`
1. **Flujo completo de venta**
   - Selección de producto
   - Agregar al carrito
   - Seleccionar cliente
   - Procesar pago
   - Generar recibo

2. **Customización de productos**
   - Diálogo de personalización
   - Selección de tamaños
   - Selección de toppings

3. **Gestión de descuentos**
   - Aplicar descuento
   - Verificar cálculo

4. **Actualización de cantidades**
   - Incrementar
   - Decrementar

5. **Modo offline**
   - Indicador de offline
   - Sincronización

### Estructura de un test E2E

```typescript
import { test, expect } from '@playwright/test';

test('should complete checkout flow', async ({ page }) => {
  await page.goto('/pos');
  
  // Seleccionar producto
  await page.click('[data-testid="product-card"]');
  
  // Verificar carrito
  await expect(page.locator('[data-testid="cart-badge"]')).toBeVisible();
  
  // Procesar pago
  await page.click('button:has-text("Pagar")');
  await page.click('button:has-text("Confirmar")');
  
  // Verificar recibo
  await expect(page.locator('[data-testid="receipt-dialog"]')).toBeVisible();
});
```

## 🔄 CI/CD

### GitHub Actions
El workflow `.github/workflows/ci.yml` ejecuta:
- ✅ Tests unitarios
- ✅ Tests E2E
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Build de producción
- ✅ Auditoría de seguridad

### Requisitos para PR
Para que un Pull Request sea aprobado debe:
1. Pasar todos los tests (cobertura mínima 30%)
2. No tener errores de lint
3. No tener errores de TypeScript
4. Build exitoso
5. Sin vulnerabilidades críticas

### Configurar Secrets en GitHub
```
Settings > Secrets and variables > Actions > New repository secret
```

Agregar:
- `TEST_EMAIL`: Email para tests E2E
- `TEST_PASSWORD`: Password para tests E2E
- `SNYK_TOKEN`: Token de Snyk (opcional)

## 📊 Cobertura

### Ver reporte de cobertura
```bash
npm run test:coverage
```

El reporte se genera en `coverage/index.html`

### Metas de cobertura

| Módulo | Objetivo | Actual |
|--------|----------|--------|
| useCart | 80% | ✅ 85% |
| usePOS | 70% | 🔄 Pendiente |
| useInventory | 70% | 🔄 Pendiente |
| **Global** | **30%** | **🔄 En progreso** |

## 🐛 Debugging

### Tests unitarios
```bash
# Modo debug con UI
npm run test:ui

# Ver logs detallados
DEBUG=* npm run test
```

### Tests E2E
```bash
# Ejecutar con headed mode
npm run test:e2e:headed

# Modo debug interactivo
npx playwright test --debug

# Ver trace de una ejecución fallida
npx playwright show-trace trace.zip
```

## 📝 Best Practices

### Tests Unitarios
1. ✅ Un concepto por test
2. ✅ Nombres descriptivos
3. ✅ AAA pattern (Arrange, Act, Assert)
4. ✅ Mock dependencies externas
5. ✅ Evitar lógica compleja en tests

### Tests E2E
1. ✅ Usar `data-testid` para selectores
2. ✅ Esperar a que elementos estén visibles
3. ✅ Simular interacciones de usuario real
4. ✅ Verificar estados finales, no intermedios
5. ✅ Limpiar estado entre tests

## 🚀 Próximos Pasos

- [ ] Aumentar cobertura a 50%
- [ ] Tests para `usePOS.ts`
- [ ] Tests para `useInventory.ts`
- [ ] Tests de integración con Supabase
- [ ] Performance testing
- [ ] Visual regression testing

## 📚 Recursos

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
