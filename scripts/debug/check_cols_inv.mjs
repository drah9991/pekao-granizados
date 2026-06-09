import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function checkColumns() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  // We query with a bogus column to force an error that lists column options, or we just select *
  const response = await fetch(`${supabaseUrl}/rest/v1/inventory_items?select=*&limit=1`, { headers });
  // If no rows, we can't see columns this way.
  // But wait! If we have rows, data[0] will have keys.
  const data = await response.json();
  if (data.length > 0) {
    console.log("Actual Columns:", Object.keys(data[0]));
  } else {
    // We'll try to insert a dummy row with a fake key to see the error message
    const insRes = await fetch(`${supabaseUrl}/rest/v1/inventory_items`, {
       method: 'POST',
       headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
       body: JSON.stringify({ "fake_col_name_to_trigger_error": "val" })
    });
    const err = await insRes.json();
    console.log("Error response (should list columns):", err);
  }
}

checkColumns();
