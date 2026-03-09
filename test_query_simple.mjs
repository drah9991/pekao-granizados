import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function test() {
  console.log("Testing invoice insert without anything...");
  
  // Try to insert a random UUID as order_id just to see the error message
  const res1 = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      order_id: '00000000-0000-0000-0000-000000000000'
    })
  });
  const data1 = await res1.json();
  console.log("Result 1:", data1);
  
  // Now try to fetch an order to get a valid order_id
  const resOrders = await fetch(`${supabaseUrl}/rest/v1/orders?select=id,store_id&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const orders = await resOrders.json();
  
  if (orders && orders.length > 0) {
    const order = orders[0];
    console.log("Found valid order:", order.id);
    
    const res2 = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        order_id: order.id
      })
    });
    const data2 = await res2.json();
    console.log("Result 2 (valid order):", data2);
  }
}

test().catch(console.error);
