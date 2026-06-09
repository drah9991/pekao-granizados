import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Testing invoice insert without anything...")
  
  // Try to insert a random UUID as order_id just to see the error message
  const { data, error } = await supabase.from('invoices').insert({
    order_id: '00000000-0000-0000-0000-000000000000'
  })
  
  console.log("Result 1:", error?.message)
  
  // Now try to fetch an order to get a valid order_id
  const { data: order } = await supabase.from('orders').select('id, store_id').limit(1).single()
  
  if (order) {
    console.log("Found valid order:", order.id)
    
    const { error: error2 } = await supabase.from('invoices').insert({
      order_id: order.id
    })
    console.log("Result 2 (valid order):", error2?.message)

    const { error: error3 } = await supabase.from('invoices').insert({
      order_id: order.id,
      store_id: order.store_id
    })
    console.log("Result 3 (with store_id):", error3?.message)
  }
}

test()
