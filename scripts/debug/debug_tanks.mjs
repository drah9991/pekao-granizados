import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function verify() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  
  try {
    console.log("Checking stores...");
    const resStores = await fetch(`${supabaseUrl}/rest/v1/stores?select=*`, { headers });
    const stores = await resStores.json();
    console.log("Stores:", stores);

    console.log("\nChecking profiles...");
    const resProfiles = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, { headers });
    const profiles = await resProfiles.json();
    console.log("Profiles:", profiles.map(p => ({ id: p.id, email: p.email, name: p.name, store_id: p.store_id })));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

verify();
