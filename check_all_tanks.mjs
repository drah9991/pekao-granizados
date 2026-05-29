import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function runDiagnostics() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  
  try {
    console.log("=== DIAGNOSTICS: MACHINE TANKS ===");
    const resTanks = await fetch(`${supabaseUrl}/rest/v1/machine_tanks?select=*`, { headers });
    const tanks = await resTanks.json();
    console.log(`Total tanks found in machine_tanks: ${tanks.length}`);
    console.log(JSON.stringify(tanks, null, 2));

    console.log("\n=== DIAGNOSTICS: VW_TANK_PERCENTAGES ===");
    const resVw = await fetch(`${supabaseUrl}/rest/v1/vw_tank_percentages?select=*`, { headers });
    const vw = await resVw.json();
    console.log(`Total rows in vw_tank_percentages: ${vw.length}`);
    console.log(JSON.stringify(vw, null, 2));

    console.log("\n=== DIAGNOSTICS: MIXTURES IN INVENTORY_ITEMS ===");
    const resMix = await fetch(`${supabaseUrl}/rest/v1/inventory_items?select=id,store_id,name,stock,is_mixture`, { headers });
    const mix = await resMix.json();
    const mixtures = Array.isArray(mix) ? mix.filter(m => m.is_mixture) : [];
    console.log(`Total mixtures in inventory_items: ${mixtures.length}`);
    console.log(JSON.stringify(mixtures, null, 2));
    
    console.log("\n=== DIAGNOSTICS: ALL STORES ===");
    const resStores = await fetch(`${supabaseUrl}/rest/v1/stores?select=id,name`, { headers });
    const stores = await resStores.json();
    console.log(`Stores found:`, stores);
  } catch (err) {
    console.error("Diagnostics failed:", err);
  }
}

runDiagnostics();
