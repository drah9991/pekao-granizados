import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

async function getSwagger() {
  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` };
  const res = await fetch(`${supabaseUrl}/rest/v1/`, { headers });
  const data = await res.json();
  fs.writeFileSync('swagger_dump.json', JSON.stringify(data, null, 2));
  console.log("Swagger definition dumped to swagger_dump.json");
}

getSwagger();
