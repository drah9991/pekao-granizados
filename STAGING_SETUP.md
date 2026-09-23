# Guía de Configuración del Entorno de Pruebas (Staging)

## 📋 Contenido
1. [Configuración de Base de Datos (Supabase)](#1-base-de-datos-supabase)
2. [Configuración de Variables de Entorno](#2-variables-de-entorno)
3. [Despliegue de la Aplicación](#3-despliegue-aplicación)
4. [Ejecución de Migraciones](#4-migraciones)
5. [Testing en Staging](#5-testing)
6. [Rollback y Recuperación](#6-rollback)

---

## 1. Base de Datos (Supabase)

### Opción A: Crear Proyecto Staging en Supabase (Recomendado)

#### Paso 1: Crear nuevo proyecto
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en "New Project"
3. Configuración:
   - **Name**: `pekao-granizados-staging`
   - **Database Password**: Guardar en lugar seguro
   - **Region**: Same as production
   - **Pricing Plan**: Free o Pro (según necesidad)

#### Paso 2: Copiar datos de producción (opcional)
```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Crear dump de producción (solo schema)
supabase db dump --db-url "postgresql://[PROD_CONNECTION_STRING]" \
  --schema public \
  --file supabase/staging_schema.sql

# Aplicar a staging
psql "postgresql://[STAGING_CONNECTION_STRING]" < supabase/staging_schema.sql

# O copiar datos también (CUIDADO: datos sensibles)
supabase db dump --db-url "postgresql://[PROD_CONNECTION_STRING]" \
  --data-only \
  --file supabase/staging_data.sql
```

#### Paso 3: Configurar políticas de acceso
```sql
-- En Supabase SQL Editor (Staging)

-- Permitir acceso público solo en staging
ALTER DATABASE postgres SET session_replication_role = 'replica';

-- Deshabilitar envío de emails en staging (si aplica)
UPDATE auth.config 
SET enable_email_confirmations = false;
```

### Opción B: Usar Branch de Supabase (Solo Pro Plan)

```bash
# Crear branch de staging
supabase branches create staging

# Conectar a branch
supabase link --project-ref [YOUR_PROJECT_REF] --branch staging
```

---

## 2. Variables de Entorno

### Crear archivo `.env.staging`
```env
# Supabase Staging
VITE_SUPABASE_URL=https://[STAGING_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[STAGING_ANON_KEY]

# Feature Flags
VITE_ENV=staging
VITE_ENABLE_RATE_LIMITING=true
VITE_ENABLE_OFFLINE_SYNC=true
VITE_ENABLE_ERROR_BOUNDARIES=true

# Analytics (usar proyecto staging separado)
VITE_SENTRY_DSN=[STAGING_SENTRY_DSN]
VITE_POSTHOG_KEY=[STAGING_POSTHOG_KEY]

# Testing
VITE_E2E_BASE_URL=https://staging.pekao.app
TEST_EMAIL=admin@staging.test
TEST_PASSWORD=Staging123!@#

# Performance
VITE_BUNDLE_ANALYZE=false
VITE_DEBUG_MODE=true
```

### Crear `.env.production` (para comparación)
```env
# Supabase Production
VITE_SUPABASE_URL=https://[PROD_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[PROD_ANON_KEY]

# Feature Flags
VITE_ENV=production
VITE_ENABLE_RATE_LIMITING=true
VITE_ENABLE_OFFLINE_SYNC=true
VITE_ENABLE_ERROR_BOUNDARIES=true

# Analytics
VITE_SENTRY_DSN=[PROD_SENTRY_DSN]
VITE_POSTHOG_KEY=[PROD_POSTHOG_KEY]

# Performance
VITE_BUNDLE_ANALYZE=false
VITE_DEBUG_MODE=false
```

### Actualizar package.json
```json
{
  "scripts": {
    "dev": "vite",
    "dev:staging": "vite --mode staging",
    "build": "vite build --mode production",
    "build:staging": "vite build --mode staging",
    "preview:staging": "vite preview --mode staging"
  }
}
```

---

## 3. Despliegue Aplicación

### Opción A: Vercel (Recomendado)

#### Configurar en Vercel Dashboard
1. Ir a proyecto en Vercel
2. Settings > Environments
3. Crear environment "Preview" o "Staging"
4. Agregar variables de entorno de staging

#### Deploy automático
```bash
# Crear rama staging
git checkout -b staging
git push origin staging

# En Vercel, configurar:
# Settings > Git > Branch: staging
# Environment: Preview
```

#### Deploy manual
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy a staging
vercel --env staging
```

### Opción B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy a staging
netlify deploy --build --context=staging

# Configurar variables en netlify.toml
```

**Archivo: `netlify.toml`**
```toml
[context.staging]
  command = "npm run build:staging"
  publish = "dist"

[context.staging.environment]
  VITE_ENV = "staging"
```

### Opción C: Docker + Railway/Fly.io

**Archivo: `Dockerfile.staging`**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_ENV=staging

RUN npm run build:staging

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.staging.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build
docker build -f Dockerfile.staging -t pekao-staging .

# Run local
docker run -p 8080:80 pekao-staging

# Deploy a Railway
railway up
```

---

## 4. Migraciones

### Script para aplicar migraciones en staging

**Archivo: `scripts/migrate-staging.sh`**
```bash
#!/bin/bash

echo "🚀 Aplicando migraciones a STAGING..."

# Cargar variables de entorno
source .env.staging

# Supabase CLI
STAGING_DB_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"

# Aplicar migración de rate limiting
echo "📝 Aplicando rate_limiting migration..."
psql "$STAGING_DB_URL" < supabase/migrations/20260923000000_add_rate_limiting.sql

# Verificar tablas creadas
echo "✅ Verificando tablas..."
psql "$STAGING_DB_URL" -c "\dt public.login_attempts"

# Verificar funciones
echo "✅ Verificando funciones..."
psql "$STAGING_DB_URL" -c "\df public.is_account_locked"

echo "🎉 Migraciones completadas!"
```

**Hacer ejecutable:**
```bash
chmod +x scripts/migrate-staging.sh
```

**Ejecutar:**
```bash
./scripts/migrate-staging.sh
```

### Verificación manual de migraciones

```sql
-- Conectar a Supabase SQL Editor (Staging)

-- Verificar tabla login_attempts
SELECT * FROM pg_tables WHERE tablename = 'login_attempts';

-- Verificar funciones
SELECT proname FROM pg_proc WHERE proname LIKE '%login%';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'login_attempts';

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'login_attempts';

-- Test básico
SELECT public.is_account_locked('test@example.com');
```

---

## 5. Testing

### Test Suite Completo en Staging

**Archivo: `scripts/test-staging.sh`**
```bash
#!/bin/bash

echo "🧪 Ejecutando suite de tests en STAGING..."

# 1. Tests unitarios
echo "1️⃣ Tests unitarios..."
npm run test -- --run

# 2. Build de staging
echo "2️⃣ Building staging..."
npm run build:staging

# 3. Tests E2E contra staging
echo "3️⃣ Tests E2E..."
VITE_E2E_BASE_URL=https://staging.pekao.app npm run test:e2e

# 4. Test de rate limiting
echo "4️⃣ Testing rate limiting..."
node scripts/test-rate-limiting.js

# 5. Test de performance
echo "5️⃣ Lighthouse performance..."
npx lighthouse https://staging.pekao.app --output=json --output-path=./reports/staging-performance.json

echo "✅ Test suite completado!"
```

**Archivo: `scripts/test-rate-limiting.js`**
```javascript
const { supabase } = require('./supabase-client');

async function testRateLimiting() {
  console.log('Testing rate limiting...');
  
  const testEmail = 'ratelimit-test@example.com';
  
  // Intentar login 6 veces con password incorrecta
  for (let i = 1; i <= 6; i++) {
    console.log(`Intento ${i}/6...`);
    
    const { data, error } = await supabase.rpc('record_login_attempt', {
      user_email: testEmail,
      was_successful: false
    });
    
    if (i === 6) {
      // Verificar que está bloqueado
      const { data: isLocked } = await supabase.rpc('is_account_locked', {
        user_email: testEmail
      });
      
      console.log(`✅ Cuenta bloqueada: ${isLocked}`);
      console.assert(isLocked === true, 'Rate limiting no funcionó');
    }
  }
  
  console.log('✅ Rate limiting funciona correctamente');
}

testRateLimiting().catch(console.error);
```

### Checklist de Testing Manual

```markdown
## Testing Manual en Staging

### 1. Autenticación
- [ ] Login exitoso funciona
- [ ] Login con credenciales incorrectas muestra error
- [ ] Después de 5 intentos fallidos, cuenta se bloquea
- [ ] Mensaje de bloqueo muestra tiempo restante
- [ ] Después de 15 minutos, cuenta se desbloquea

### 2. POS
- [ ] Seleccionar producto lo agrega al carrito
- [ ] Cantidad se actualiza correctamente
- [ ] Descuento se aplica correctamente
- [ ] Pago procesa y genera recibo
- [ ] En modo offline, venta se guarda localmente
- [ ] Al reconectar, ventas se sincronizan automáticamente

### 3. Dashboard
- [ ] KPIs cargan correctamente
- [ ] Gráficos renderizan sin errores
- [ ] Si un widget falla, solo ese falla (no todo el dashboard)
- [ ] Datos se actualizan en tiempo real

### 4. Performance
- [ ] Página carga en < 3 segundos
- [ ] Navegación entre páginas es fluida
- [ ] No hay errores en console
- [ ] Bundle size < 600KB (gzipped)

### 5. Error Handling
- [ ] Error boundaries capturan errores correctamente
- [ ] UI de error es clara y accionable
- [ ] Botón "Reintentar" funciona
- [ ] Errores se reportan a Sentry (verificar en dashboard)
```

---

## 6. Rollback y Recuperación

### Plan de Rollback para Migraciones

**Archivo: `supabase/migrations/20260923000000_rollback_rate_limiting.sql`**
```sql
-- ROLLBACK: Eliminar rate limiting

-- Drop functions
DROP FUNCTION IF EXISTS public.is_account_locked;
DROP FUNCTION IF EXISTS public.record_login_attempt;
DROP FUNCTION IF EXISTS public.get_lockout_remaining_time;
DROP FUNCTION IF EXISTS public.clear_login_attempts;

-- Drop table
DROP TABLE IF EXISTS public.login_attempts CASCADE;

COMMENT ON DATABASE postgres IS 'Rate limiting rollback executed';
```

**Ejecutar rollback:**
```bash
psql "$STAGING_DB_URL" < supabase/migrations/20260923000000_rollback_rate_limiting.sql
```

### Backup antes de cambios

```bash
# Backup completo de staging antes de aplicar cambios
pg_dump "$STAGING_DB_URL" > backups/staging-pre-phase1-$(date +%Y%m%d).sql

# Restaurar si algo sale mal
psql "$STAGING_DB_URL" < backups/staging-pre-phase1-20260923.sql
```

### Revertir deploy de aplicación

**Vercel:**
```bash
# Ver deployments
vercel list

# Revertir a deployment anterior
vercel rollback [DEPLOYMENT_URL]
```

**Git:**
```bash
# Revertir commit de fase 1
git revert 8d2960e

# O reset duro (cuidado)
git reset --hard HEAD~1
git push --force origin staging
```

---

## 7. Monitoreo de Staging

### Setup de Sentry para Staging

**Archivo: `src/lib/sentry.staging.ts`**
```typescript
import * as Sentry from "@sentry/react";

if (import.meta.env.VITE_ENV === 'staging') {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: "staging",
    tracesSampleRate: 1.0, // 100% en staging
    replaysSessionSampleRate: 1.0, // Grabar todas las sesiones
    beforeSend(event) {
      // Tag todos los eventos como staging
      event.tags = { ...event.tags, environment: 'staging' };
      return event;
    },
  });
}
```

### Dashboard de monitoreo

Crear dashboard en Sentry/DataDog/Grafana con:
- Tasa de errores en staging vs producción
- Performance metrics (FCP, LCP, TTI)
- Rate limiting: intentos bloqueados
- Offline sync: ventas pendientes
- Error boundaries: capturas por módulo

---

## 8. Promoción a Producción

### Checklist antes de promoción

```markdown
## Pre-deployment Checklist

### Testing
- [ ] Todos los tests pasan (unit + E2E)
- [ ] Testing manual completado sin issues críticos
- [ ] Performance es igual o mejor que producción actual
- [ ] No hay errores en Sentry durante 48 horas

### Database
- [ ] Migraciones ejecutadas exitosamente en staging
- [ ] Backup de producción creado
- [ ] Rollback script probado en staging

### Code
- [ ] Code review completado
- [ ] Changelog actualizado
- [ ] Variables de entorno de producción verificadas

### Communication
- [ ] Equipo notificado del deployment
- [ ] Plan de rollback comunicado
- [ ] Ventana de mantenimiento programada (si aplica)
```

### Proceso de promoción gradual

```bash
# 1. Deploy a producción sin activar features
# (usar feature flags desactivados)

# 2. Activar para 10% de usuarios
# (A/B testing con feature flags)

# 3. Monitorear por 24 horas

# 4. Aumentar a 50%

# 5. Monitorear por 24 horas

# 6. Activar al 100%
```

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisar logs de Sentry** (staging environment)
2. **Verificar estado de Supabase** (dashboard de staging)
3. **Consultar** `FASE_1_COMPLETADA.md` para detalles técnicos
4. **Ejecutar rollback** si es crítico

---

## 🎯 Siguientes Pasos

Una vez validado en staging:

1. Programar deployment a producción
2. Ejecutar migraciones en horario de bajo tráfico
3. Monitorear métricas por 48 horas
4. Documentar lecciones aprendidas
5. Continuar con Fase 2

**Staging URL esperado:** `https://staging.pekao.app`  
**Supabase Staging:** `https://[PROJECT_ID].supabase.co`
