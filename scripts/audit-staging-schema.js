#!/usr/bin/env node
/**
 * Auditoría completa del schema de STAGING vs LOCAL
 * Identifica tablas faltantes, columnas incorrectas, y políticas RLS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.staging' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales STAGING en .env.staging');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Schema esperado según migración base
const EXPECTED_SCHEMA = {
  tables: [
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
  ],
  columns: {
    profiles: ['id', 'name', 'phone', 'store_id', 'created_at'],
    user_roles: ['id', 'user_id', 'role'],
    stores: ['id', 'name', 'address', 'tax_rate', 'currency', 'config', 'created_at'],
    products: ['id', 'sku', 'name', 'description', 'price', 'cost', 'images', 'variants', 'recipe', 'active', 'created_at'],
    store_stock: ['id', 'store_id', 'product_id', 'qty', 'min_qty', 'batch_info', 'updated_at'],
    customers: ['id', 'name', 'email', 'phone', 'addresses', 'total_spent', 'last_order_at', 'created_at'],
    orders: ['id', 'customer_id', 'store_id', 'status', 'subtotal', 'tax', 'total', 'payment', 'assigned_driver', 'created_by', 'created_at', 'updated_at'],
    order_items: ['id', 'order_id', 'product_id', 'name', 'qty', 'price', 'tax', 'subtotal'],
    invoices: ['id', 'order_id', 'number', 'pdf_path', 'issued_at', 'total'],
    movements: ['id', 'product_id', 'store_id', 'qty', 'type', 'reason', 'user_id', 'created_at']
  }
};

async function getTableInfo(tableName) {
  try {
    // Obtener columnas de la tabla
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return { exists: false, error: error.message };
    }

    // Obtener count de registros
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    return {
      exists: true,
      count: count || 0,
      columns: data && data.length > 0 ? Object.keys(data[0]) : []
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function checkRLS(tableName) {
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT relrowsecurity
          FROM pg_class
          WHERE relname = '${tableName}'
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `
      });

    if (error) return { enabled: 'unknown', error: error.message };

    return { enabled: data?.[0]?.relrowsecurity || false };
  } catch (err) {
    // Si no existe exec_sql, intentar con query directa
    return { enabled: 'unknown', error: 'No se pudo verificar RLS' };
  }
}

async function audit() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  AUDITORÍA DE SCHEMA - STAGING vs BASE MIGRATION          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📍 URL: ${supabaseUrl}\n`);

  const results = {
    missing_tables: [],
    existing_tables: [],
    column_mismatches: [],
    data_counts: {}
  };

  // 1. VERIFICAR TABLAS
  console.log('📋 1. VERIFICANDO TABLAS\n');
  console.log('═'.repeat(60));

  for (const table of EXPECTED_SCHEMA.tables) {
    const info = await getTableInfo(table);

    if (!info.exists) {
      console.log(`❌ ${table.padEnd(20)} FALTANTE`);
      results.missing_tables.push(table);
    } else {
      console.log(`✅ ${table.padEnd(20)} ${info.count} registros`);
      results.existing_tables.push(table);
      results.data_counts[table] = info.count;

      // Verificar columnas
      const expectedCols = EXPECTED_SCHEMA.columns[table] || [];
      const actualCols = info.columns || [];

      const missing = expectedCols.filter(c => !actualCols.includes(c));
      const extra = actualCols.filter(c => !expectedCols.includes(c));

      if (missing.length > 0 || extra.length > 0) {
        results.column_mismatches.push({
          table,
          missing,
          extra
        });
      }
    }
  }

  // 2. DETALLES DE COLUMNAS
  if (results.column_mismatches.length > 0) {
    console.log('\n\n🔍 2. DIFERENCIAS EN COLUMNAS\n');
    console.log('═'.repeat(60));

    for (const mismatch of results.column_mismatches) {
      console.log(`\n📦 ${mismatch.table}:`);

      if (mismatch.missing.length > 0) {
        console.log(`  ❌ Faltan: ${mismatch.missing.join(', ')}`);
      }

      if (mismatch.extra.length > 0) {
        console.log(`  ⚠️  Extra: ${mismatch.extra.join(', ')}`);
      }
    }
  }

  // 3. RESUMEN
  console.log('\n\n📊 3. RESUMEN\n');
  console.log('═'.repeat(60));
  console.log(`✅ Tablas correctas:     ${results.existing_tables.length}/${EXPECTED_SCHEMA.tables.length}`);
  console.log(`❌ Tablas faltantes:     ${results.missing_tables.length}`);
  console.log(`⚠️  Columnas incorrectas: ${results.column_mismatches.length}`);

  if (results.missing_tables.length > 0) {
    console.log('\n❌ TABLAS FALTANTES:');
    results.missing_tables.forEach(t => console.log(`   - ${t}`));
  }

  // 4. DATOS EXISTENTES
  console.log('\n\n💾 4. DATOS EXISTENTES (NO ELIMINAR)\n');
  console.log('═'.repeat(60));

  const tablesWithData = Object.entries(results.data_counts)
    .filter(([_, count]) => count > 0);

  if (tablesWithData.length > 0) {
    tablesWithData.forEach(([table, count]) => {
      console.log(`⚠️  ${table}: ${count} registros - PRESERVAR`);
    });
  } else {
    console.log('✓ No hay datos que preservar');
  }

  // 5. RECOMENDACIONES
  console.log('\n\n💡 5. RECOMENDACIONES\n');
  console.log('═'.repeat(60));

  if (results.missing_tables.length > 0) {
    console.log('1. Ejecutar migración consolidada para crear tablas faltantes');
  }

  if (results.column_mismatches.length > 0) {
    console.log('2. Corregir schemas de tablas con columnas incorrectas');
  }

  if (tablesWithData.length > 0) {
    console.log('3. Usar CREATE TABLE IF NOT EXISTS y ALTER TABLE para preservar datos');
  }

  console.log('\n✅ Auditoría completada\n');

  return results;
}

audit().catch(err => {
  console.error('\n❌ Error en auditoría:', err.message);
  process.exit(1);
});
