import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function check() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const potentials = ['unit_of_measure', 'unit_measure', 'unit', 'uom'];
  
  for (const p of potentials) {
    const res = await fetch(`${supabaseUrl}/rest/v1/inventory_items?select=${p}&limit=1`, { headers });
    const data = await res.json();
    if (!data.message) {
      console.log(`FOUND: Column '${p}' exists in inventory_items.`);
      return;
    }
  }
  console.log("NONE of the expected column names found.");
}

check();
