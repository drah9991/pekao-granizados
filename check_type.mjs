import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTypes() {
  const { data, error } = await supabase.rpc('check_app_role_exists')
  if (error) {
    console.error('Error checking type:', error)
    // Try raw query if possible, or just list types
    const { data: types, error: typesError } = await supabase.from('pg_type').select('typname').eq('typname', 'app_role')
    console.log('Types found:', types)
  } else {
    console.log('Result:', data)
  }
}

checkTypes()
