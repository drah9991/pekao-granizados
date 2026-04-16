import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function listProducts() {
  const response = await fetch(`${supabaseUrl}/rest/v1/products?select=id,name,type,category&apikey=${supabaseKey}`);
  const data = await response.json();
  console.log("--- Products List ---");
  data.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name} | Type: ${p.type} | Cat: ${p.category}`));
}

listProducts();
