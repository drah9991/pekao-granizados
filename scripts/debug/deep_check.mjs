import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function deepCheck() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  
  const [prods, items, recipes] = await Promise.all([
     fetch(`${supabaseUrl}/rest/v1/products?select=id,name,type&type=eq.granizado`, { headers }).then(r => r.json()),
     fetch(`${supabaseUrl}/rest/v1/inventory_items?select=id,name,stock,is_mixture&is_mixture=eq.true`, { headers }).then(r => r.json()),
     fetch(`${supabaseUrl}/rest/v1/recipes?select=*`, { headers }).then(r => r.json())
  ]);

  console.log("--- Products (Granizados) ---");
  console.log(prods);
  console.log("--- Inventory Items (Mixtures) ---");
  console.log(items);
  console.log("--- Recipes ---");
  console.log(recipes);
}

deepCheck();
