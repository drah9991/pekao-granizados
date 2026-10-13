import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Verificando tablas en PRODUCCIÓN...');
  console.log('📍 URL:', supabaseUrl);
  console.log('');

  const tables = [
    'categories',
    'products',
    'product_types',
    'product_customization',
    'inventory',
    'suppliers',
    'sales',
    'customers',
  ];

  const existing = [];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✓ ${table}: ${count ?? 0} registros`);
        existing.push(table);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }

  console.log('\n📋 Tablas con datos:', existing.filter(t => t).join(', '));
}

checkTables().catch(console.error);
