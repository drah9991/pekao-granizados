import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];
fetch(supabaseUrl+'/rest/v1/?apikey='+supabaseKey).then(r=>r.json()).then(d=>{
  console.log("Movements Properties:", Object.keys(d.definitions.movements.properties));
  console.log("Inventory Items Properties:", Object.keys(d.definitions.inventory_items.properties));
});
