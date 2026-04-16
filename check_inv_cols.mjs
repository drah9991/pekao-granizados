import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function checkColumns() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const response = await fetch(`${supabaseUrl}/rest/v1/inventory_items?limit=1`, { headers });
  const data = await response.json();
  if (data.length > 0) {
    console.log("Columns in inventory_items:", Object.keys(data[0]));
  } else {
    // try to get table description from postgrest /
    const rootRes = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const rootData = await rootRes.json();
    console.log("Definitions for inventory_items:", Object.keys(rootData.definitions.inventory_items.properties));
  }
}

checkColumns();
