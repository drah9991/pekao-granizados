import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY no están definidos en .env');
  process.exit(1);
}

console.log('🔑 Usando service_role key para bypass RLS');
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportForStaging() {
  console.log('🔄 Exportando datos de producción para staging...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const exportDir = join('backups', `staging_import_${timestamp}`);

  mkdirSync(exportDir, { recursive: true });
  console.log(`📁 Directorio: ${exportDir}\n`);

  // Solo exportar tablas que existen en staging
  const tables = ['categories', 'products'];
  const exports = {};

  for (const table of tables) {
    console.log(`  - Exportando ${table}...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      console.log(`    ⚠️  Error: ${error.message}`);
      exports[table] = [];
    } else {
      console.log(`    ✓ ${data.length} registros`);
      exports[table] = data;

      // Guardar JSON individual
      writeFileSync(
        join(exportDir, `${table}.json`),
        JSON.stringify(data, null, 2)
      );
    }
  }

  console.log('\n📝 Generando archivo SQL...\n');

  // Generar SQL
  let sql = `-- Importación de datos de producción a staging\n`;
  sql += `-- Generado: ${new Date().toISOString()}\n\n`;

  // Limpiar en orden correcto (products primero por FK)
  sql += `-- Limpiar datos existentes\n`;
  sql += `TRUNCATE TABLE public.products RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.categories RESTART IDENTITY CASCADE;\n\n`;

  // Insertar categories primero
  if (exports.categories.length > 0) {
    sql += `-- Insertar ${exports.categories.length} registros en categories\n`;
    for (const row of exports.categories) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${val}'`;
      });

      sql += `INSERT INTO public.categories (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    sql += '\n';
  }

  // Insertar products
  if (exports.products.length > 0) {
    sql += `-- Insertar ${exports.products.length} registros en products\n`;
    for (const row of exports.products) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${val}'`;
      });

      sql += `INSERT INTO public.products (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    sql += '\n';
  }

  sql += `-- Verificación\n`;
  sql += `SELECT 'Categories: ' || COUNT(*)::text FROM public.categories;\n`;
  sql += `SELECT 'Products: ' || COUNT(*)::text FROM public.products;\n`;

  const sqlPath = join(exportDir, 'import.sql');
  writeFileSync(sqlPath, sql);

  console.log('✅ Exportación completada\n');
  console.log('📊 Resumen:');
  for (const [table, data] of Object.entries(exports)) {
    console.log(`  - ${table}: ${data.length} registros`);
  }

  console.log(`\n📄 Archivo SQL generado: ${sqlPath}`);
  console.log('\n🔄 Siguiente paso:');
  console.log(`   1. Abre https://supabase.com/dashboard/project/llzdxcujvagctnzjymqh/sql/new`);
  console.log(`   2. Copia y pega el contenido de: ${sqlPath}`);
  console.log(`   3. Ejecuta el SQL`);
}

exportForStaging().catch(console.error);
