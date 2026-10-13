import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load production credentials
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY no están definidos en .env');
  process.exit(1);
}

console.log('🔑 Usando service_role key para bypass RLS');

const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES = ['categories', 'products', 'product_customization', 'inventory', 'suppliers'];

async function exportData() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join('backups', `production_export_${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Exportando datos de producción...');
  console.log('📁 Directorio:', backupDir);
  console.log('');

  const allData = {};

  for (const table of TABLES) {
    try {
      console.log(`  - Exportando ${table}...`);
      const { data, error } = await supabase.from(table).select('*');

      if (error) {
        console.log(`    ⚠️  Error: ${error.message}`);
        continue;
      }

      allData[table] = data || [];

      // Save as JSON
      const jsonPath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

      console.log(`    ✓ ${data?.length || 0} registros`);
    } catch (err) {
      console.log(`    ⚠️  Error: ${err.message}`);
    }
  }

  // Generate SQL INSERT statements
  console.log('');
  console.log('📝 Generando archivo SQL...');

  const sqlPath = path.join(backupDir, 'import.sql');
  let sql = '-- Importación de datos de producción a staging\n';
  sql += `-- Generado: ${new Date().toISOString()}\n\n`;

  // Truncate tables first
  sql += '-- Limpiar datos existentes\n';
  for (const table of TABLES.reverse()) {
    sql += `TRUNCATE TABLE public.${table} RESTART IDENTITY CASCADE;\n`;
  }
  sql += '\n';

  // Insert data
  TABLES.reverse(); // Back to original order
  for (const table of TABLES) {
    const data = allData[table];
    if (!data || data.length === 0) continue;

    sql += `-- Insertar ${data.length} registros en ${table}\n`;

    const columns = Object.keys(data[0]);

    for (const row of data) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      });

      sql += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }

    sql += '\n';
  }

  fs.writeFileSync(sqlPath, sql);

  console.log('');
  console.log('✅ Exportación completada');
  console.log('');
  console.log('📊 Resumen:');
  for (const table of TABLES) {
    const count = allData[table]?.length || 0;
    console.log(`  - ${table}: ${count} registros`);
  }
  console.log('');
  console.log('📄 Archivo SQL generado:', sqlPath);
  console.log('');
  console.log('🔄 Siguiente paso:');
  console.log('   1. Abre https://supabase.com/dashboard/project/llzdxcujvagctnzjymqh/sql/new');
  console.log('   2. Copia y pega el contenido de:', sqlPath);
  console.log('   3. Ejecuta el SQL');
}

exportData().catch(console.error);
