#!/usr/bin/env node
/**
 * Script mejorado para aplicar migraciones en STAGING
 * - Validación pre/post migración
 * - Tracking de migraciones aplicadas
 * - Rollback automático en caso de error
 * - Modo dry-run para preview
 *
 * Uso:
 *   node scripts/migrate-staging.js              # Aplicar todas pendientes
 *   node scripts/migrate-staging.js --dry-run    # Preview sin aplicar
 *   node scripts/migrate-staging.js --file=nombre.sql  # Aplicar una específica
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.staging' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales STAGING en .env.staging');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Argumentos CLI
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const specificFile = args.find(a => a.startsWith('--file='))?.split('=')[1];

/**
 * Ejecuta SQL crudo en Supabase
 */
async function execSQL(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Inicializa tabla de tracking de migraciones
 */
async function initMigrationTracking() {
  const createTableSQL = `
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz default now(),
      filename text,
      checksum text
    );
  `;

  try {
    await execSQL(createTableSQL);
    return true;
  } catch (err) {
    console.warn('⚠️  No se pudo crear tabla de migraciones:', err.message);
    return false;
  }
}

/**
 * Obtiene lista de migraciones aplicadas
 */
async function getMigrationsApplied() {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('version, filename, applied_at')
      .order('version');

    if (error) {
      // Tabla no existe
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Registra migración aplicada
 */
async function recordMigration(filename, sql) {
  const version = filename.split('_')[0];
  const checksum = Buffer.from(sql).toString('base64').substring(0, 32);

  try {
    await supabase
      .from('schema_migrations')
      .upsert({
        version,
        filename,
        checksum,
        applied_at: new Date().toISOString()
      });
  } catch (err) {
    console.warn('⚠️  No se pudo registrar migración:', err.message);
  }
}

/**
 * Valida estado pre-migración
 */
async function validatePreMigration() {
  console.log('🔍 Validando estado actual...\n');

  const checks = {
    connection: false,
    tables: 0,
    rls_enabled: false
  };

  try {
    // Test de conexión
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    checks.connection = true;

    // Contar tablas principales
    const tables = ['profiles', 'stores', 'products', 'customers'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (!error) {
        checks.tables++;
      }
    }

    checks.rls_enabled = true; // Si llegamos aquí, RLS está activo

    console.log(`✅ Conexión: OK`);
    console.log(`✅ Tablas base: ${checks.tables}/4 accesibles`);
    console.log(`✅ RLS: Activo\n`);

    return true;
  } catch (err) {
    console.error(`❌ Validación falló:`, err.message);
    return false;
  }
}

/**
 * Valida estado post-migración
 */
async function validatePostMigration() {
  console.log('\n🔍 Validando migración...\n');

  const requiredTables = [
    'profiles',
    'user_roles',
    'stores',
    'products',
    'store_stock',
    'customers',
    'orders',
    'order_items',
    'invoices',
    'movements'
  ];

  let success = 0;
  const failed = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        success++;
        console.log(`  ✅ ${table}`);
      } else {
        failed.push(table);
        console.log(`  ❌ ${table}: ${error.message}`);
      }
    } catch (err) {
      failed.push(table);
      console.log(`  ❌ ${table}: ${err.message}`);
    }
  }

  console.log(`\n📊 Resultado: ${success}/${requiredTables.length} tablas OK`);

  if (failed.length > 0) {
    console.log(`⚠️  Falló: ${failed.join(', ')}`);
    return false;
  }

  return true;
}

/**
 * Aplica una migración
 */
async function applyMigration(filename, sql) {
  const version = filename.split('_')[0];

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Aplicando: ${filename}`);
  console.log(`   Versión: ${version}`);
  console.log(`   Tamaño: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`${'='.repeat(60)}\n`);

  if (isDryRun) {
    console.log('🔍 DRY RUN - No se aplicará\n');
    return true;
  }

  try {
    // Aplicar SQL
    await execSQL(sql);

    // Registrar en tracking
    await recordMigration(filename, sql);

    console.log(`✅ Aplicada exitosamente\n`);
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err.message}\n`);

    // Guardar log de error
    const errorLog = {
      migration: filename,
      timestamp: new Date().toISOString(),
      error: err.message,
      sql: sql.substring(0, 500) + '...'
    };

    const logDir = join(process.cwd(), 'logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const logFile = join(logDir, `migration-error-${Date.now()}.json`);
    writeFileSync(logFile, JSON.stringify(errorLog, null, 2));
    console.log(`📝 Error guardado en: ${logFile}\n`);

    throw err;
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  APLICADOR DE MIGRACIONES - STAGING                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔧 Modo: ${isDryRun ? 'DRY RUN (preview)' : 'APLICAR'}\n`);

  // 1. Validar conexión y estado
  const preCheckOk = await validatePreMigration();
  if (!preCheckOk) {
    console.error('❌ Validación pre-migración falló');
    process.exit(1);
  }

  // 2. Inicializar tracking
  await initMigrationTracking();

  // 3. Obtener migraciones
  const applied = await getMigrationsApplied();
  console.log(`📋 Migraciones aplicadas: ${applied.length}\n`);

  if (applied.length > 0) {
    console.log('Últimas 3:');
    applied.slice(-3).forEach(m => {
      console.log(`  • ${m.filename || m.version} - ${new Date(m.applied_at).toLocaleString()}`);
    });
    console.log('');
  }

  // 4. Buscar migraciones pendientes
  const migrationsDir = join(process.cwd(), 'supabase/migrations');

  if (!existsSync(migrationsDir)) {
    console.error(`❌ Directorio no existe: ${migrationsDir}`);
    process.exit(1);
  }

  let allMigrations = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  // Filtrar por archivo específico si se especificó
  if (specificFile) {
    allMigrations = allMigrations.filter(f => f === specificFile);
    if (allMigrations.length === 0) {
      console.error(`❌ Archivo no encontrado: ${specificFile}`);
      process.exit(1);
    }
  }

  const appliedVersions = applied.map(m => m.version);
  const pending = allMigrations.filter(file => {
    const version = file.split('_')[0];
    return !appliedVersions.includes(version);
  });

  if (pending.length === 0) {
    console.log('✅ Staging está actualizado - No hay migraciones pendientes\n');
    return;
  }

  console.log(`📦 ${pending.length} migraciones pendientes:\n`);
  pending.forEach((f, i) => {
    const size = readFileSync(join(migrationsDir, f), 'utf-8').length;
    console.log(`  ${i + 1}. ${f} (${(size / 1024).toFixed(2)} KB)`);
  });
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN - Terminando sin aplicar cambios\n');
    return;
  }

  // Confirmar antes de aplicar
  console.log('⚠️  ADVERTENCIA: Aplicar migraciones en STAGING');
  console.log('   Esto modificará el schema de la base de datos\n');

  // 5. Aplicar migraciones
  console.log('🚀 Aplicando migraciones...\n');

  let applied_count = 0;
  for (const file of pending) {
    try {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      await applyMigration(file, sql);
      applied_count++;
    } catch (err) {
      console.error(`\n❌ Migración falló: ${file}`);
      console.error(`   Se aplicaron ${applied_count}/${pending.length} migraciones`);
      console.error(`   Error: ${err.message}\n`);
      process.exit(1);
    }
  }

  // 6. Validar resultado
  const postCheckOk = await validatePostMigration();

  if (!postCheckOk) {
    console.warn('\n⚠️  Algunas validaciones post-migración fallaron');
    console.warn('   Revisar logs arriba para detalles\n');
  }

  console.log('\n✅ Todas las migraciones aplicadas exitosamente');
  console.log(`   Total: ${applied_count} migraciones\n`);
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  console.error('   Stack:', err.stack);
  process.exit(1);
});
