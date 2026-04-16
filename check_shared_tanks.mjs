import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function checkSharedTanks() {
  const response = await fetch(`${supabaseUrl}/rest/v1/recipes?select=inventory_item_id,product_id,products(name)&apikey=${supabaseKey}`);
  const data = await response.json();
  
  const mapping = {};
  data.forEach(r => {
    if (!mapping[r.inventory_item_id]) mapping[r.inventory_item_id] = [];
    mapping[r.inventory_item_id].push(r.products?.name);
  });
  
  console.log("--- Shared Inventory Items Diagnostic ---");
  for (const [id, products] of Object.entries(mapping)) {
    if (products.length > 1) {
      console.log(`Inventory Item ${id} is shared by: ${products.join(", ")}`);
    } else {
       // console.log(`Inventory Item ${id} is unique to: ${products[0]}`);
    }
  }
}

checkSharedTanks();
