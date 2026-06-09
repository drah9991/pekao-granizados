import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function verify() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/vw_tank_percentages?select=*&limit=1`, { headers });
    const data = await res.json();
    console.log("vw_tank_percentages result:", data);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

verify();
