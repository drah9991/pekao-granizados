
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error querying inventory_items:", error);
  } else {
    console.log("Success! Columns:", data.length > 0 ? Object.keys(data[0]) : "Empty table, but query worked");
  }
  
  // Try to insert a dummy row to see the exact error if it fails
  const { error: insError } = await supabase
    .from('inventory_items')
    .insert([{ 
        name: 'Test Test Test', 
        store_id: 'c72851e5-380d-4e1c-952b-34713638e70b', // Assuming this ID from subagent logs
        unit_of_measure: 'test',
        stock: 0
    }]);
    
  if (insError) {
    console.error("Insert error details:", insError);
  } else {
    console.log("Insert worked!");
  }
}

checkSchema();
