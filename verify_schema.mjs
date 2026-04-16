import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function verify() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  
  // 1. Intentar obtener una fila para ver columnas
  const res = await fetch(`${supabaseUrl}/rest/v1/inventory_items?select=*&limit=1`, { headers });
  const data = await res.json();
  
  if (Array.isArray(data) && data.length > 0) {
    console.log("Columnas actuales en inventory_items:", Object.keys(data[0]));
  } else if (data.message) {
    console.log("Error al consultar:", data.message);
  } else {
    // Si la tabla está vacía, forzar un error de columna inexistente
    const res2 = await fetch(`${supabaseUrl}/rest/v1/inventory_items?select=none_col`, { headers });
    const data2 = await res2.json();
    console.log("Error (lista de columnas esperada):", data2.message);
  }
}

verify();
