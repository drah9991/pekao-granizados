import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { t_name: 'products' })
  if (error) {
    console.error('Error fetching columns:', error)
    // Fallback: try a simple select
    const { data: selectData, error: selectError } = await supabase.from('products').select('*').limit(1)
    if (selectError) {
      console.error('Select error:', selectError)
    } else {
      console.log('Columns in products:', Object.keys(selectData[0] || {}))
    }
  } else {
    console.log('Columns in products:', data)
  }

  const { data: custData, error: custError } = await supabase.from('customers').select('*').limit(1)
  if (!custError) {
    console.log('Columns in customers:', Object.keys(custData[0] || {}))
  }
}

checkColumns()
