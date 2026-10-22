# ❓ FAQ y Troubleshooting - Pekao Granizados POS

## 📚 Preguntas Frecuentes (FAQ)

### 🎯 General

**Q: ¿Por qué necesitamos un entorno de staging?**
A: Staging permite:
- Probar cambios sin afectar producción
- Validar migraciones de base de datos de forma segura
- Ejecutar tests en un ambiente real
- Detectar problemas antes de que lleguen a usuarios
- Tener un plan de rollback probado

**Q: ¿Cuánto tiempo toma implementar todo esto?**
A: 
- Crear proyecto Supabase: 5 min
- Configurar variables: 2 min
- Aplicar migraciones: 3 min
- Ejecutar tests: 5 min
- Deploy a staging: 10 min
- Validación manual: 15 min
**Total: 45-60 minutos**

**Q: ¿Qué pasa si algo falla en staging?**
A: Tienes varias opciones:
1. Ejecutar rollback SQL (incluido)
2. Revertir commit en git
3. Consultar esta guía de troubleshooting
4. No afecta producción en absoluto

**Q: ¿Los tests son obligatorios?**
A: Sí para PR. El CI/CD rechazará PRs que no pasen:
- Tests unitarios
- Tests E2E
- ESLint
- TypeScript check
- Build exitoso

---

### 🧪 Testing

**Q: ¿Por qué fallan los tests si el código funciona localmente?**
A: Posibles causas:
1. Variables de entorno diferentes
2. Datos de prueba no configurados
3. Dependencias no instaladas
4. Versiones diferentes de Node/npm

Solución:
```bash
# Limpiar y reinstalar
rm -rf node_modules
npm cache clean --force
npm install --legacy-peer-deps

# Re-ejecutar tests
npm run test
```

**Q: ¿Cómo debuggear un test que falla?**
A: 
```bash
# Tests unitarios con UI
npm run test:ui

# Tests E2E con navegador visible
npm run test:e2e:headed

# Tests E2E en modo debug
npx playwright test --debug

# Ver trace de test fallido
npx playwright show-trace trace.zip
```

**Q: ¿Los tests E2E requieren staging deployado?**
A: No necesariamente:
- Puedes usar `localhost:5173` para desarrollo
- O usar la URL de staging una vez deployado
- Configurar con `VITE_E2E_BASE_URL` en `.env.staging`

---

### 🔒 Rate Limiting

**Q: ¿Por qué 5 intentos y 15 minutos?**
A: Es un balance entre seguridad y UX:
- Previene ataques de fuerza bruta
- No molesta a usuarios legítimos con errores de tipeo
- 15 minutos es suficiente disuasión
- Es configurable en el código SQL

**Q: ¿Cómo desbloquear manualmente una cuenta?**
A:
```sql
-- En Supabase SQL Editor
SELECT public.clear_login_attempts('usuario@email.com');
```

**Q: ¿El rate limiting funciona por IP o por email?**
A: Por email principalmente. También registra IP pero no bloquea por IP.
Razón: IPs compartidas (oficinas, WiFi público) bloquearían a muchos usuarios.

**Q: ¿Qué pasa si alguien usa VPN para cambiar IP?**
A: El bloqueo es por email, no por IP. Cambiar IP no evita el bloqueo.

---

### 🌐 Offline Sync

**Q: ¿Cuántas ventas pueden guardarse offline?**
A: IndexedDB típicamente soporta:
- 50 MB mínimo (estándar del navegador)
- Hasta varios GB en navegadores modernos
- Aproximadamente 500-1000 órdenes sin problemas

**Q: ¿Qué pasa si el usuario cierra el navegador con ventas pendientes?**
A: Las ventas se mantienen en IndexedDB:
- Persisten entre sesiones
- Se sincronizan al abrir nuevamente
- No se pierden a menos que se limpie el navegador

**Q: ¿Por qué exponential backoff en lugar de retry constante?**
A: 
- Evita saturar el servidor cuando hay problemas
- Reduce consumo de batería en móviles
- Previene "thundering herd" (muchos clientes reintentando a la vez)
- Mejor experiencia: no congela la UI con reintentos rápidos

---

### 📦 Performance

**Q: ¿Por qué el bundle sigue siendo grande?**
A: Posibles causas:
1. No aplicaste las optimizaciones de `vite.config.ts`
2. Importaciones incorrectas (importar toda la librería en vez de componentes)
3. Assets grandes sin optimizar

Análisis:
```bash
npm run build:analyze
# Abrirá dist/stats.html mostrando qué es grande
```

**Q: ¿React Query cache de 15 minutos no es mucho?**
A: Depende del tipo de datos:
- Productos/categorías: Cambian poco → 15-30 min OK
- Órdenes en tiempo real: Necesitan menos → 1-5 min
- Ya está configurado así en `src/App.tsx`

**Q: ¿Cómo medir mejoras de performance?**
A:
```bash
# Lighthouse (local)
npm run build:staging
npx lighthouse http://localhost:4173

# Lighthouse (staging)
npx lighthouse https://tu-staging.vercel.app

# Comparar scores antes/después
```

---

### 🗄️ Base de Datos

**Q: ¿Por qué usar RLS en vez de validar en el backend?**
A: RLS es "defense in depth":
- Backend puede tener bugs
- RLS es la última línea de defensa
- Supabase lo hace en la DB, más rápido
- Permite optimizaciones automáticas

**Q: ¿Las migraciones son reversibles?**
A: Sí, incluimos rollback SQL:
```bash
psql "$STAGING_DB_URL" < supabase/staging/20260923000000_rollback_rate_limiting.sql
```

**Q: ¿Cómo verificar que RLS está activo?**
A:
```sql
-- En Supabase SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Debe mostrar rowsecurity = true
```

---

### 🚀 Deployment

**Q: ¿Puedo usar otro servicio además de Vercel?**
A: Sí, funcionará en:
- Vercel (recomendado, más fácil)
- Netlify
- Cloudflare Pages
- Railway
- Fly.io
- Docker + cualquier host

**Q: ¿Necesito dos proyectos Supabase (staging + prod)?**
A: Recomendado pero no obligatorio:
- **Ideal**: 2 proyectos separados (seguridad total)
- **Alternativa**: Branches en plan Pro de Supabase
- **No recomendado**: Mismo proyecto para ambos

**Q: ¿Cuánto cuesta Supabase staging?**
A: 
- Plan Free: $0 (suficiente para staging)
- Plan Pro: $25/mes (si necesitas más)
- Solo pagas si excedes límites Free

---

## 🆘 Troubleshooting Común

### Error: `MODULE_NOT_FOUND`

```bash
Error: Cannot find module 'vitest'
```

**Causa**: Dependencias no instaladas  
**Solución**:
```bash
npm install --legacy-peer-deps
```

---

### Error: Migración falla con `connection refused`

```bash
Error: FATAL: password authentication failed
```

**Causa**: Password incorrecto o URL mal formada  
**Solución**:
```bash
# Verificar variables
cat .env.staging | grep SUPABASE

# Obtener password correcto de Supabase Dashboard:
# Settings > Database > Connection string > Password
```

---

### Error: Tests E2E timeout

```bash
Error: Test timeout of 30000ms exceeded
```

**Causa**: Staging no está deployado o es muy lento  
**Solución**:
```bash
# Verificar que staging responde
curl https://tu-staging-url.vercel.app

# Aumentar timeout en playwright.config.ts
timeout: 60000, // 60 segundos

# O ejecutar solo en localhost
VITE_E2E_BASE_URL=http://localhost:5173 npm run test:e2e
```

---

### Error: `ReferenceError: localStorage is not defined`

```bash
ReferenceError: localStorage is not defined in Vitest
```

**Causa**: Tests unitarios corren en Node, no en navegador  
**Solución**: Ya está resuelto en `src/test/setup.ts` con jsdom

Si persiste:
```bash
# Verificar vitest.config.ts tiene:
environment: 'jsdom'
```

---

### Error: Build falla con `Cannot resolve @/...`

```bash
Error: Cannot resolve '@/components/...'
```

**Causa**: Alias no configurado correctamente  
**Solución**: Verificar en `vite.config.ts`:
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
},
```

---

### Error: Rate limiting no funciona en UI

**Síntomas**: Puedo intentar login infinitas veces sin bloqueo  
**Causa**: Migración no aplicada o variables incorrectas  
**Solución**:
```bash
# 1. Verificar migración en Supabase SQL Editor
SELECT * FROM pg_tables WHERE tablename = 'login_attempts';
# Debe retornar 1 fila

# 2. Test manual
SELECT public.is_account_locked('test@example.com');
# Debe retornar false

# 3. Si no existe, aplicar migración
npm run staging:migrate
```

---

### Error: Offline sync no funciona

**Síntomas**: Ventas offline no se sincronizan al reconectar  
**Diagnóstico**:
```bash
# 1. Verificar en DevTools > Application > IndexedDB
# Debe existir base de datos "pekao-pos" con tabla "pendingOrders"

# 2. Verificar en Console
# Debe mostrar logs de sincronización
```

**Solución**:
```typescript
// Verificar que usePOS.ts usa retryWhenOnline
import { retryWhenOnline } from '@/utils/offlineSync';

const handleSync = async () => {
  await retryWhenOnline(() => syncPendingOrders());
};
```

---

### Error: Bundle muy grande después de optimización

**Síntomas**: Bundle sigue > 1MB después de aplicar optimizaciones  
**Diagnóstico**:
```bash
npm run build:analyze
# Abre dist/stats.html
```

**Causas comunes**:
1. **Importación incorrecta**:
```typescript
// ❌ Malo
import * as Icons from 'lucide-react'; 

// ✅ Bueno
import { User, Settings } from 'lucide-react';
```

2. **Assets sin optimizar**:
```bash
# Optimizar imágenes
npm install -D imagemin imagemin-webp
```

3. **Source maps en producción**:
```typescript
// vite.config.ts
sourcemap: mode === 'production' ? false : true
```

---

### Error: CI/CD falla en GitHub Actions

**Síntomas**: Tests pasan localmente pero fallan en CI  
**Solución**:
```bash
# 1. Verificar Node version match
# .github/workflows/ci.yml debe usar misma versión que local
node-version: '18'

# 2. Verificar que secrets estén configurados
# GitHub > Settings > Secrets and variables > Actions
# Deben existir: TEST_EMAIL, TEST_PASSWORD

# 3. Cache issues
# Agregar en workflow:
- name: Clear cache
  run: npm cache clean --force
```

---

### Error: Vercel deployment falla

```bash
Error: Build exceeded maximum duration
```

**Causa**: Build muy lento  
**Solución**:
```bash
# 1. Verificar en vercel.json
{
  "buildCommand": "npm run build:staging",
  "installCommand": "npm install --legacy-peer-deps"
}

# 2. Aumentar timeout en Vercel Dashboard
# Settings > General > Build & Development Settings
# Increase Function Execution Timeout

# 3. Optimizar build localmente primero
time npm run build:staging
# Debe tomar < 2 minutos
```

---

## 🔍 Comandos de Diagnóstico

### Verificar instalación completa

```bash
# Script de verificación
cat <<'EOF' > scripts/verify-setup.sh
#!/bin/bash
echo "🔍 Verificando setup..."

# Node & npm
node -v && echo "✅ Node instalado" || echo "❌ Node no encontrado"
npm -v && echo "✅ npm instalado" || echo "❌ npm no encontrado"

# Dependencias críticas
npm list vitest &>/dev/null && echo "✅ Vitest instalado" || echo "❌ Vitest no instalado"
npm list @playwright/test &>/dev/null && echo "✅ Playwright instalado" || echo "❌ Playwright no instalado"

# Archivos de configuración
[ -f "vitest.config.ts" ] && echo "✅ vitest.config.ts existe" || echo "❌ vitest.config.ts falta"
[ -f "playwright.config.ts" ] && echo "✅ playwright.config.ts existe" || echo "❌ playwright.config.ts falta"
[ -f ".env.staging" ] && echo "✅ .env.staging existe" || echo "⚠️  .env.staging falta (copiar de .example)"

# Tests
[ -d "src/hooks/__tests__" ] && echo "✅ Tests unitarios existen" || echo "❌ Tests unitarios faltan"
[ -d "e2e" ] && echo "✅ Tests E2E existen" || echo "❌ Tests E2E faltan"

echo ""
echo "🎉 Verificación completada"
EOF

chmod +x scripts/verify-setup.sh
./scripts/verify-setup.sh
```

### Verificar estado de Supabase

```bash
# Test de conexión
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.staging' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

supabase.from('profiles').select('count').single()
  .then(() => console.log('✅ Conexión a Supabase OK'))
  .catch(err => console.error('❌ Error:', err.message));
"
```

### Verificar performance local

```bash
# Bundle size
npm run build:staging
du -sh dist
du -h dist/*.js | sort -h

# Lighthouse
npm run preview:staging &
sleep 3
npx lighthouse http://localhost:4173 --only-categories=performance
killall node
```

---

## 📞 Obtener Ayuda

Si después de revisar esta guía sigues teniendo problemas:

1. **Revisa logs detallados**:
```bash
npm run test -- --reporter=verbose
npm run test:e2e -- --trace on
```

2. **Consulta documentación**:
- `STAGING_SETUP.md` - Guía completa
- `TESTING.md` - Guía de testing
- `ARQUITECTURA_VISUAL.md` - Diagramas

3. **Busca en Issues de GitHub**:
- Vitest: https://github.com/vitest-dev/vitest/issues
- Playwright: https://github.com/microsoft/playwright/issues
- Supabase: https://github.com/supabase/supabase/issues

4. **Crea un Issue** en el proyecto con:
- Descripción del problema
- Pasos para reproducir
- Logs completos
- Versiones (Node, npm, dependencias)

---

## ✅ Checklist de Validación

Antes de considerar que staging está "listo":

- [ ] Proyecto Supabase creado
- [ ] Variables de entorno configuradas
- [ ] Migraciones aplicadas exitosamente
- [ ] `npm run test` pasa
- [ ] `npm run test:e2e` pasa (o se salta si no hay staging)
- [ ] `npm run build:staging` exitoso
- [ ] Deploy a staging funciona
- [ ] Banner de staging visible en UI
- [ ] Login funciona
- [ ] Rate limiting bloquea después de 5 intentos
- [ ] POS procesa venta correctamente
- [ ] Modo offline guarda ventas localmente
- [ ] Sincronización offline funciona al reconectar
- [ ] Dashboard carga sin errores
- [ ] Error boundary funciona (widget falla, no todo)
- [ ] Bundle size < 1MB inicial
- [ ] No errores en console del navegador
- [ ] Sentry recibe errores (si configurado)
- [ ] 48 horas de monitoreo sin incidentes críticos

Una vez completado, **estás listo para producción**.
