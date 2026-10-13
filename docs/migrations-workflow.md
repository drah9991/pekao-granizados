# Migrations Workflow - Pekao Granizados

Guía completa para gestión de migraciones de base de datos en Supabase.

## 📚 Tabla de Contenidos

1. [Arquitectura](#arquitectura)
2. [Creación de Migraciones](#creación-de-migraciones)
3. [Aplicación en Staging](#aplicación-en-staging)
4. [Checklist Pre-Deploy](#checklist-pre-deploy)
5. [Troubleshooting](#troubleshooting)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ Arquitectura

### Entornos

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│   LOCAL     │ ───> │   STAGING    │ ───> │  PRODUCTION    │
│  Supabase   │      │ llzdxcujv... │      │  (pendiente)   │
│   Local     │      │  Supabase    │      │                │
└─────────────┘      └──────────────┘      └────────────────┘
```

### Flujo de Migraciones

```
1. Desarrollo Local
   ├─ Crear migración SQL en supabase/migrations/
   ├─ Probar localmente con `supabase db reset`
   └─ Commit a Git

2. Deploy a Staging
   ├─ Auditar estado actual
   ├─ Aplicar migraciones pendientes
   ├─ Validar post-migración
   └─ Probar funcionalidad

3. Deploy a Producción
   ├─ Backup completo
   ├─ Aplicar migraciones
   ├─ Validar
   └─ Monitorear
```

---

## 📝 Creación de Migraciones

### 1. Generar Nueva Migración

```bash
# Opción A: Con Supabase CLI (recomendado)
supabase migration new nombre_descriptivo

# Opción B: Manual
# Crear archivo: supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql
```

### 2. Estructura de Migración

```sql
-- ============================================
-- DESCRIPCIÓN DE LA MIGRACIÓN
-- ============================================
-- Qué hace: Agrega tabla de promociones
-- Por qué: Para sistema de descuentos
-- Afecta: Tablas nuevas, no modifica existentes

-- 1. CREAR TABLA
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  discount numeric check (discount >= 0 and discount <= 100),
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. ENABLE RLS
alter table public.promotions enable row level security;

-- 3. POLÍTICAS RLS
do $$ 
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'promotions' 
    and policyname = 'Staff can view promotions'
  ) then
    create policy "Staff can view promotions"
      on public.promotions for select
      to authenticated
      using (true);
  end if;
end $$;

-- 4. ÍNDICES
create index if not exists idx_promotions_active 
  on public.promotions(active);

-- 5. COMENTARIOS
comment on table public.promotions is 'Sistema de promociones y descuentos';
```

### 3. Principios de Migraciones Seguras

✅ **HACER:**
- Usar `IF NOT EXISTS` / `IF EXISTS`
- Hacer migraciones idempotentes (ejecutar múltiples veces = mismo resultado)
- Agregar columnas como `nullable` primero, luego `NOT NULL` en otra migración
- Comentar qué hace y por qué
- Validar datos antes de constraints

❌ **NO HACER:**
- `DROP TABLE` sin verificar que está vacía
- `ALTER COLUMN` que rompa datos existentes
- Cambios no reversibles sin backup
- Migraciones que dependen de datos específicos

---

## 🚀 Aplicación en Staging

### Scripts Disponibles

```bash
# 1. Auditar estado actual
node scripts/audit-staging-schema.js

# 2. Preview de migraciones (dry-run)
node scripts/migrate-staging.js --dry-run

# 3. Aplicar todas las pendientes
node scripts/migrate-staging.js

# 4. Aplicar una específica
node scripts/migrate-staging.js --file=20250131000000_staging_consolidation.sql
```

### Proceso Paso a Paso

#### 1. Pre-Migración: Auditar

```bash
node scripts/audit-staging-schema.js
```

**Revisar output:**
- ¿Qué tablas faltan?
- ¿Qué columnas son incorrectas?
- ¿Hay datos que preservar?

#### 2. Dry-Run: Preview

```bash
node scripts/migrate-staging.js --dry-run
```

**Verificar:**
- Número de migraciones pendientes
- Orden de aplicación
- Tamaño de archivos

#### 3. Aplicar Migraciones

```bash
node scripts/migrate-staging.js
```

**El script automáticamente:**
- ✅ Valida conexión
- ✅ Verifica estado pre-migración
- ✅ Aplica migraciones en orden
- ✅ Registra en `schema_migrations`
- ✅ Valida estado post-migración

#### 4. Post-Migración: Validar

```bash
# Re-auditar para confirmar
node scripts/audit-staging-schema.js

# Verificar datos preservados
node scripts/check-staging-tables.js
```

---

## ✅ Checklist Pre-Deploy

### Antes de Aplicar Migraciones

- [ ] **Backup realizado** (producción) o confirmado no necesario (staging)
- [ ] **Auditoría completada** - Se conoce estado actual
- [ ] **Migraciones probadas localmente** con `supabase db reset`
- [ ] **Dry-run ejecutado** - Se revisó preview
- [ ] **RLS verificado** - Todas las tablas nuevas tienen políticas
- [ ] **Datos críticos identificados** - Se sabe qué preservar
- [ ] **Rollback plan** - Se tiene plan B si falla

### Durante Migración

- [ ] **Logs monitoreados** - Ver output completo
- [ ] **Sin errores** - Todas las migraciones aplicadas OK
- [ ] **Validación post-migración** - Script confirma tablas OK

### Después de Migración

- [ ] **Tablas verificadas** - Existen y son accesibles
- [ ] **Datos intactos** - Registros existentes preservados
- [ ] **RLS funcional** - Políticas activas y correctas
- [ ] **Frontend probado** - App funciona correctamente
- [ ] **Performance OK** - Queries no degradadas

---

## 🔧 Troubleshooting

### Error: "exec_sql function does not exist"

**Problema:** Supabase no tiene la función RPC `exec_sql`.

**Solución:** Crear la función manualmente en SQL Editor de Supabase:

```sql
create or replace function exec_sql(sql_query text)
returns json
language plpgsql
security definer
as $$
declare
  result json;
begin
  execute sql_query;
  return json_build_object('success', true);
exception when others then
  return json_build_object('error', SQLERRM);
end;
$$;
```

### Error: "relation already exists"

**Problema:** Migración no es idempotente.

**Solución:** Usar `IF NOT EXISTS` / `IF EXISTS`:

```sql
-- ❌ MAL
create table promotions (...);

-- ✅ BIEN
create table if not exists promotions (...);
```

### Error: "column does not exist"

**Problema:** Orden incorrecto de migraciones o columnas faltantes.

**Solución:**
1. Verificar orden de archivos de migración
2. Asegurar dependencias satisfechas
3. Re-auditar schema actual

### Error: "permission denied for table"

**Problema:** RLS bloqueando acceso o políticas incorrectas.

**Solución:**
1. Verificar que tabla tiene RLS habilitado
2. Revisar políticas con `\d+ nombre_tabla` en psql
3. Usar service_role key para operaciones admin

### Migraciones Aplicadas Parcialmente

**Problema:** Script falló a mitad de camino.

**Solución:**
1. Revisar `logs/migration-error-*.json`
2. Identificar última migración exitosa en `schema_migrations`
3. Corregir SQL problemático
4. Re-ejecutar (las aplicadas se saltean automáticamente)

---

## 🎯 Mejores Prácticas

### 1. Naming Conventions

```
YYYYMMDDHHMMSS_descripcion_clara.sql

Ejemplos:
✅ 20250131120000_add_promotions_table.sql
✅ 20250131120100_add_store_config_columns.sql
❌ 20250131120000_changes.sql
❌ 20250131120000_fix.sql
```

### 2. Estructura Consistente

```sql
-- 1. COMENTARIOS de qué y por qué
-- 2. TABLAS (create/alter)
-- 3. RLS (enable + policies)
-- 4. ÍNDICES
-- 5. TRIGGERS
-- 6. FUNCIONES
-- 7. DATOS (seeds si necesario)
```

### 3. Migraciones Pequeñas

```
✅ Una migración = un feature
✅ 50-200 líneas típicamente
✅ Cambios relacionados agrupados

❌ Una migración con 10 tablas diferentes
❌ Cambios no relacionados mezclados
```

### 4. Testing Local First

```bash
# 1. Aplicar localmente
supabase db reset

# 2. Verificar schema
supabase db diff

# 3. Probar app
npm run dev

# 4. Si todo OK, commit y deploy a staging
```

### 5. Documentar Cambios Complejos

```sql
-- ============================================
-- MIGRATION: Reestructurar order_items
-- ============================================
-- BREAKING CHANGE: Cambia subtotal de column a generated
-- 
-- ANTES: subtotal numeric
-- DESPUÉS: subtotal numeric generated always as (qty * price) stored
--
-- IMPACTO: 
-- - Queries que escriben subtotal directamente fallarán
-- - Se recalcula automáticamente en inserts/updates
-- 
-- ROLLBACK: 
-- - Convertir de generated a column normal
-- - Poblar con (qty * price)
```

### 6. Coordinar con Código Frontend

```
Migration + Code Deploy deben ser compatibles:

Opción 1: Backward Compatible
├─ Deploy migration primero
├─ Código viejo funciona con schema nuevo
└─ Deploy código después

Opción 2: Feature Flag
├─ Deploy código con flag OFF
├─ Deploy migration
├─ Activar flag
└─ Código nuevo usa schema nuevo
```

---

## 📂 Estructura de Archivos

```
pekao-granizados/
├── supabase/
│   └── migrations/
│       ├── 20251015032609_..._base_schema.sql    # Schema inicial
│       └── 20250131000000_staging_consolidation.sql  # Corrección staging
├── scripts/
│   ├── audit-staging-schema.js      # Auditoría completa
│   ├── migrate-staging.js           # Aplicador mejorado
│   └── check-staging-tables.js      # Verificación rápida
├── docs/
│   └── migrations-workflow.md       # Esta guía
└── logs/
    └── migration-error-*.json       # Logs de errores (auto-generados)
```

---

## 🔄 Casos de Uso Comunes

### Agregar Nueva Tabla

```sql
create table if not exists public.nueva_tabla (
  id uuid primary key default gen_random_uuid(),
  -- columnas...
  created_at timestamptz default now()
);

alter table public.nueva_tabla enable row level security;

create policy "policy_name"
  on public.nueva_tabla for select
  to authenticated
  using (true);

create index if not exists idx_nueva_tabla_campo 
  on public.nueva_tabla(campo);
```

### Agregar Columna a Tabla Existente

```sql
-- Paso 1: Agregar como nullable
alter table public.products
  add column if not exists nueva_columna text;

-- Paso 2: Poblar datos (si necesario)
update public.products
set nueva_columna = 'valor_default'
where nueva_columna is null;

-- Paso 3: (Opcional) Hacer NOT NULL en otra migración
-- alter table public.products
--   alter column nueva_columna set not null;
```

### Modificar Columna Existente

```sql
-- ⚠️ CUIDADO: Puede romper datos

-- Opción A: Agregar constraint (seguro)
alter table public.products
  add constraint products_price_positive 
  check (price >= 0);

-- Opción B: Cambiar tipo (revisar compatibilidad)
-- 1. Verificar datos compatibles
-- 2. Alterar tipo
alter table public.products
  alter column qty type numeric
  using qty::numeric;
```

### Renombrar Tabla o Columna

```sql
-- ⚠️ BREAKING CHANGE para frontend

-- Renombrar tabla
alter table old_name rename to new_name;

-- Renombrar columna
alter table products
  rename column old_col to new_col;

-- NOTA: Coordinar con deploy de código
```

---

## 📞 Soporte

### Si algo sale mal:

1. **No entrar en pánico** - Las migraciones son tracked
2. **Revisar logs** en `logs/migration-error-*.json`
3. **Auditar estado** con `audit-staging-schema.js`
4. **Consultar esta guía** - Troubleshooting section
5. **Revisar Git history** - Ver qué cambió

### Recursos:

- **Supabase Docs**: https://supabase.com/docs/guides/database/migrations
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **SQL Editor de Supabase**: Para queries manuales de emergencia

---

**Última actualización:** 2025-01-31  
**Mantenido por:** Equipo Pekao Granizados
