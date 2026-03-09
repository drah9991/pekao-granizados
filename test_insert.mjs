import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="(.*)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="(.*)"/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id').limit(1);
  if (pErr || !profiles || profiles.length === 0) {
    console.log("Could not find a profile to test with", pErr);
    return;
  }
  const userId = profiles[0].id;
  
  console.log("Testing insert into user_roles with real user_id:", userId);
  
  const { data, error } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'manager'
  });
  console.log("Error for manager:", error?.message || error);
  
  const { error: e2 } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: 'bogus'
  });
  console.log("Error for bogus:", e2?.message || e2);
}

test().catch(console.error);
