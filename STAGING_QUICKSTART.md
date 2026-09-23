# Entorno de Staging - Guía Rápida

## 🚀 Quick Start

### 1. Configurar Variables de Entorno
```bash
# Copiar template
cp .env.staging.example .env.staging

# Editar con tus credenciales de Supabase Staging
nano .env.staging
```

### 2. Crear Proyecto Staging en Supabase
1. Ir a https://supabase.com/dashboard
2. Crear nuevo proyecto: `pekao-granizados-staging`
3. Copiar URL y ANON_KEY a `.env.staging`

### 3. Aplicar Migraciones
```bash
# Aplicar migración de rate limiting
npm run staging:migrate
```

### 4. Deploy a Staging
```bash
# Build local
npm run build:staging

# Preview local
npm run preview:staging

# O deploy a Vercel/Netlify
vercel --env staging
```

### 5. Ejecutar Tests
```bash
# Suite completa
npm run staging:test

# Solo rate limiting
npm run staging:test-rate-limit

# Solo E2E
npm run test:e2e
```

## 📁 Archivos Importantes

- `STAGING_SETUP.md` - Guía completa de configuración
- `.env.staging.example` - Template de variables
- `scripts/migrate-staging.sh` - Script de migraciones
- `scripts/test-staging.sh` - Suite de tests
- `scripts/test-rate-limiting.js` - Test específico de rate limiting

## 🎯 Checklist de Validación

- [ ] Supabase staging configurado
- [ ] Variables de entorno completas
- [ ] Migraciones aplicadas exitosamente
- [ ] Tests unitarios pasan
- [ ] Tests E2E pasan
- [ ] Rate limiting funciona
- [ ] Deploy exitoso
- [ ] Testing manual completado

## 🔄 Workflow

```
[Develop] → [Test Local] → [Deploy Staging] → [Test Staging] → [Deploy Production]
```

## 📞 Problemas Comunes

### Migración falla
```bash
# Ejecutar rollback
psql "$STAGING_DB_URL" < supabase/migrations/20260923000000_rollback_rate_limiting.sql

# Revisar error y corregir
# Re-intentar migración
```

### Tests E2E fallan
```bash
# Verificar que staging está deployado
curl https://staging.pekao.app

# Verificar variable de entorno
echo $VITE_E2E_BASE_URL

# Ejecutar con más verbosidad
npm run test:e2e:headed
```

### Rate limiting no funciona
```bash
# Test manual
node scripts/test-rate-limiting.js

# Verificar en Supabase SQL Editor
SELECT * FROM public.login_attempts LIMIT 10;
```

Para más detalles, ver **STAGING_SETUP.md**
