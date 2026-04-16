import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log("Analyzing shared tanks...");

    // Fetch all granizados recipes
    const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
            id,
            product_id,
            inventory_item_id,
            products(name, type, store_id),
            inventory_items(name, stock, store_id)
        `);

    if (error) {
        console.error(error);
        return;
    }

    const grouped = {};
    for (const r of recipes) {
        const iId = r.inventory_item_id;
        if (!iId) continue;
        if (!grouped[iId]) grouped[iId] = [];
        grouped[iId].push(r);
    }

    let fixes = 0;
    for (const [iId, list] of Object.entries(grouped)) {
        if (list.length > 1) {
            console.log(`\nFound Shared Tank: ${list[0].inventory_items?.name} (ID: ${iId})`);
            
            // Keep the first product linked to the original tank.
            const originalRecipe = list[0];
            const originalProduct = originalRecipe.products;
            console.log(`  - Keeping original tank for: ${originalProduct?.name}`);

            // For the others, create a new tank and update recipe
            for (let i = 1; i < list.length; i++) {
                const dupRecipe = list[i];
                const dupProduct = dupRecipe.products;
                const newTankName = `Mezcla ${dupProduct.name}`;
                
                console.log(`  - Creating new tank for: ${dupProduct?.name} -> "${newTankName}"`);
                
                // 1. Create independent inventory item
                const { data: newItem, error: iErr } = await supabase
                    .from('inventory_items')
                    .insert({
                        store_id: dupProduct.store_id, // assuming array but actually object
                        name: newTankName,
                        category: 'Insumos',
                        stock: 0,
                        unit: 'ml',
                        min_stock: 5000,
                        is_mixture: true
                    }).select('id').single();
                
                if (iErr) {
                    console.error("Error creating item:", iErr);
                    continue;
                }

                // 2. Update recipe
                const { error: rErr } = await supabase
                    .from('recipes')
                    .update({ inventory_item_id: newItem.id })
                    .eq('id', dupRecipe.id);
                
                if (rErr) {
                    console.error("Error updating recipe:", rErr);
                    continue;
                }
                
                fixes++;
                console.log(`    * Fixed!`);
            }
        }
    }

    console.log(`\nProcess completed! Separated ${fixes} tanks.`);
}

main();
