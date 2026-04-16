import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function listColumns() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  // Using rest/v1/ to get swagger definition which has columns
  const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, { headers });
  const data = await res.json();
  const props = data.definitions.inventory_items.properties;
  console.log("Actual Columns in inventory_items:", Object.keys(props));
}

listColumns();
