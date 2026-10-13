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

async function exportAllForStaging() {
  console.log('🔄 Exportando TODOS los datos de producción (incluyendo ventas del último año)...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const exportDir = join('backups', `full_staging_import_${timestamp}`);

  mkdirSync(exportDir, { recursive: true });
  console.log(`📁 Directorio: ${exportDir}\n`);

  // TODAS las tablas que existen en staging (sin sales que no existe ahí)
  const tables = [
    'categories',
    'suppliers',
    'customers',
    'product_types',
    'products',
    'product_customization',
    'inventory'
  ];

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
  let sql = `-- Importación COMPLETA de datos de producción a staging (TODAS las tablas)\n`;
  sql += `-- Generado: ${new Date().toISOString()}\n\n`;

  // Limpiar en orden inverso (respetando FK) - solo tablas confirmadas en staging
  sql += `-- Limpiar datos existentes (orden inverso para FK)\n`;
  sql += `TRUNCATE TABLE public.inventory RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.product_customization RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.products RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.product_types RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.customers RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.suppliers RESTART IDENTITY CASCADE;\n`;
  sql += `TRUNCATE TABLE public.categories RESTART IDENTITY CASCADE;\n\n`;

  // Insertar en orden correcto (padres primero)
  for (const table of tables) {
    if (exports[table] && exports[table].length > 0) {
      sql += `-- Insertar ${exports[table].length} registros en ${table}\n`;

      for (const row of exports[table]) {
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

        sql += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sql += '\n';
    }
  }

  sql += `-- Verificación final\n`;
  for (const table of tables) {
    sql += `SELECT '${table}: ' || COUNT(*)::text FROM public.${table};\n`;
  }

  const sqlPath = join(exportDir, 'import.sql');
  writeFileSync(sqlPath, sql);

  console.log('✅ Exportación completada\n');
  console.log('📊 Resumen:');
  let total = 0;
  for (const [table, data] of Object.entries(exports)) {
    console.log(`  - ${table}: ${data.length} registros`);
    total += data.length;
  }
  console.log(`\n📦 Total: ${total} registros`);

  console.log(`\n📄 Archivo SQL generado: ${sqlPath}`);
  console.log('\n🔄 Siguiente paso:');
  console.log(`   1. Abre https://supabase.com/dashboard/project/llzdxcujvagctnzjymqh/sql/new`);
  console.log(`   2. Copia y pega el contenido de: ${sqlPath}`);
  console.log(`   3. Ejecuta el SQL`);
}

exportAllForStaging().catch(console.error);
