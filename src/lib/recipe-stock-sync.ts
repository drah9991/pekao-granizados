import { supabase } from "@/integrations/supabase/client";

/**
 * Syncs mixture/tank stock (inventory_items) for a product's recipe whenever its
 * raw store_stock changes outside the sale flow (manual entry/adjustment, product
 * create/edit). Mirrors the RPC call used by process_sale for the sell-side.
 * Non-blocking: a missing/failed recipe sync must not roll back the store_stock write.
 */
export async function syncRecipeStock(productId: string, storeId: string, qtyDelta: number) {
  try {
    const { data: recipes } = await supabase
      .from("recipes")
      .select("inventory_item_id, quantity_required")
      .eq("product_id", productId);

    if (!recipes || recipes.length === 0) return;

    for (const recipe of recipes) {
      await supabase.rpc("increment_inventory_stock", {
        p_item_id: recipe.inventory_item_id,
        p_store_id: storeId,
        p_amount: qtyDelta * (recipe.quantity_required || 1),
      });
    }
  } catch (error) {
    console.error("Recipe stock sync error (non-critical):", error);
  }
}
