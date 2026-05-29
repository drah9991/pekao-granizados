import fs from 'fs';
import path from 'path';

function getEnv() {
  let content = '';
  if (fs.existsSync('.env.development.local')) {
    content = fs.readFileSync('.env.development.local', 'utf-8');
    console.log("Using .env.development.local");
  } else if (fs.existsSync('.env')) {
    content = fs.readFileSync('.env', 'utf-8');
    console.log("Using .env");
  } else {
    throw new Error("No env file found");
  }
  
  const urlMatch = content.match(/VITE_SUPABASE_URL\s*=\s*["']?([^"'\s]+)["']?/);
  const keyMatch = content.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*["']?([^"'\s]+)["']?/);
  
  if (!urlMatch || !keyMatch) {
    throw new Error("Could not parse supabase URL or KEY from env file");
  }
  
  return {
    url: urlMatch[1],
    key: keyMatch[1]
  };
}

async function run() {
  const { url, key } = getEnv();
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
  
  try {
    console.log("Supabase URL:", url);
    
    console.log("Fetching stores...");
    const resStores = await fetch(`${url}/rest/v1/stores?select=*`, { headers });
    const stores = await resStores.json();
    console.log("Stores count:", Array.isArray(stores) ? stores.length : 0);
    console.log("Stores:", JSON.stringify(stores, null, 2));

    console.log("\nFetching profiles...");
    const resProfiles = await fetch(`${url}/rest/v1/profiles?select=*`, { headers });
    const profiles = await resProfiles.json();
    console.log("Profiles count:", Array.isArray(profiles) ? profiles.length : 0);
    console.log("Profiles:", JSON.stringify(profiles.map(p => ({ id: p.id, email: p.email, name: p.name, store_id: p.store_id })), null, 2));

    console.log("\nFetching vw_tank_percentages...");
    const resTanks = await fetch(`${url}/rest/v1/vw_tank_percentages?select=*`, { headers });
    const tanks = await resTanks.json();
    console.log("Tanks count:", Array.isArray(tanks) ? tanks.length : 0);
    console.log("Tanks:", JSON.stringify(tanks, null, 2));

    console.log("\nFetching machine_tanks...");
    const resMachineTanks = await fetch(`${url}/rest/v1/machine_tanks?select=*`, { headers });
    const mTanks = await resMachineTanks.json();
    console.log("Machine Tanks count:", Array.isArray(mTanks) ? mTanks.length : 0);
    console.log("Machine Tanks:", JSON.stringify(mTanks, null, 2));
  } catch (err) {
    console.error("Error executing query:", err);
  }
}

run();
