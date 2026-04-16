import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function checkTypesConfig() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const response = await fetch(`${supabaseUrl}/rest/v1/product_types_config?select=*`, { headers });
  const data = await response.json();
  console.log("--- Product Types Config ---");
  console.table(data);
}

checkTypesConfig();
