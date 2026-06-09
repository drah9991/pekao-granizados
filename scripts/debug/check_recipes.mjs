import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function listAllRecipes() {
  const response = await fetch(`${supabaseUrl}/rest/v1/recipes?select=inventory_item_id,product_id,products(name)&apikey=${supabaseKey}`);
  const data = await response.json();
  
  if (data.error) {
    console.log("Error:", data.error);
    return;
  }

  console.log(`Total recipes found: ${data.length}`);
  data.forEach((r, i) => {
    console.log(`${i+1}. Product: ${r.products?.name} (${r.product_id}) -> Item: ${r.inventory_item_id}`);
  });
}

listAllRecipes();
