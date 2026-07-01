/**
 * Utility functions for optimistic updates of inventory (tanks and product stocks).
 */

export interface CartItem {
  productId?: string;
  product_id?: string;
  quantity: number;
  sizeMultiplier?: number;
  size_multiplier?: number;
  baseVolume?: number;
  base_volume?: number;
}

export interface TankStatus {
  id: string;
  store_id: string;
  name: string;
  current_volume_ml: number;
  max_capacity_ml: number;
  percentage: number;
  inventory_item_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  type?: string;
  category?: string;
  price: number;
  stock?: number;
  mixtureStock?: number;
  base_volume?: number;
  recipes?: Array<{
    inventory_item_id: string;
    quantity_required: number;
    inventory_items?: {
      id: string;
      stock: number;
      is_mixture: boolean;
      unit?: string;
    };
  }>;
}

/**
 * Calculates the optimistic state of machine tanks after a checkout.
 */
export function calculateOptimisticTanks(
  cart: CartItem[],
  oldTanks: TankStatus[],
  productsList: Product[]
): TankStatus[] {
  if (!Array.isArray(oldTanks)) return [];
  if (!Array.isArray(cart) || !Array.isArray(productsList)) return oldTanks;

  return oldTanks.map((tank) => {
    let updatedVolume = Number(tank.current_volume_ml) || 0;

    cart.forEach((item) => {
      const itemId = item.productId || item.product_id;
      const product = productsList.find((p) => p.id === itemId);
      if (!product) return;

      const recipes = product.recipes || [];
      recipes.forEach((recipe) => {
        if (recipe.inventory_item_id === tank.inventory_item_id) {
          const qtyRequired = Number(recipe.quantity_required) || 0;
          const quantity = Number(item.quantity) || 0;
          const multiplier = Number(item.sizeMultiplier || item.size_multiplier) || 1;
          const baseVol = Number(product.base_volume || item.baseVolume || item.base_volume) || 4;

          const unit = recipe.inventory_items?.unit || 'ml';
          let deduction = 0;
          if (unit === 'ml') {
            deduction = qtyRequired * baseVol * multiplier * 29.57 * quantity;
          } else {
            deduction = qtyRequired * quantity * multiplier;
          }
          updatedVolume = Math.max(0, updatedVolume - deduction);
        }
      });
    });

    const maxCap = Number(tank.max_capacity_ml) || 12000;
    const percentage = Math.round((updatedVolume / maxCap) * 100 * 100) / 100;
    return {
      ...tank,
      current_volume_ml: Math.round(updatedVolume * 100) / 100,
      percentage
    };
  });
}

/**
 * Calculates the optimistic state of products stock after a checkout.
 */
export function calculateOptimisticProducts(
  cart: CartItem[],
  oldProducts: Product[]
): Product[] {
  if (!Array.isArray(oldProducts)) return [];
  if (!Array.isArray(cart)) return oldProducts;

  // Track stock of inventory items to update consistently
  const inventoryItemStocks: Record<string, number> = {};

  oldProducts.forEach((product) => {
    const recipes = product.recipes || [];
    recipes.forEach((recipe) => {
      if (recipe.inventory_items && recipe.inventory_item_id) {
        inventoryItemStocks[recipe.inventory_item_id] = Number(recipe.inventory_items.stock) || 0;
      }
    });
  });

  // Deduct based on cart items
  cart.forEach((item) => {
    const itemId = item.productId || item.product_id;
    const product = oldProducts.find((p) => p.id === itemId);
    if (!product) return;

    const recipes = product.recipes || [];
    recipes.forEach((recipe) => {
      const recipeItemId = recipe.inventory_item_id;
      if (recipeItemId && inventoryItemStocks[recipeItemId] !== undefined) {
        const qtyRequired = Number(recipe.quantity_required) || 0;
        const quantity = Number(item.quantity) || 0;
        const multiplier = Number(item.sizeMultiplier || item.size_multiplier) || 1;
        const baseVol = Number(product.base_volume || item.baseVolume || item.base_volume) || 4;

        const unit = recipe.inventory_items?.unit || 'ml';
        let deduction = 0;
        if (unit === 'ml') {
          deduction = qtyRequired * baseVol * multiplier * 29.57 * quantity;
        } else {
          deduction = qtyRequired * quantity * multiplier;
        }
        inventoryItemStocks[recipeItemId] = Math.max(0, inventoryItemStocks[recipeItemId] - deduction);
      }
    });
  });

  return oldProducts.map((product) => {
    // 1. Deduct unit stock
    const cartItems = cart.filter((item) => (item.productId || item.product_id) === product.id);
    const totalQtyOrdered = cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const originalStock = Number(product.stock) || 0;
    const newStock = Math.max(0, originalStock - totalQtyOrdered);

    // 2. Update recipes' inventory items stock
    const updatedRecipes = (product.recipes || []).map((recipe) => {
      if (recipe.inventory_items && recipe.inventory_item_id) {
        return {
          ...recipe,
          inventory_items: {
            ...recipe.inventory_items,
            stock: inventoryItemStocks[recipe.inventory_item_id]
          }
        };
      }
      return recipe;
    });

    // 3. Recalculate mixtureStock
    let newMixtureStock = 0;
    const isMixtureTracked = product.type === "granizado" || product.category === "Granizado";
    
    if (updatedRecipes.length > 0) {
      const mixtureRecipe = updatedRecipes.find((r) => r.inventory_items?.is_mixture === true);
      if (mixtureRecipe) {
        newMixtureStock = mixtureRecipe.inventory_items?.stock ?? 0;
      } else {
        const firstRecipe = updatedRecipes[0];
        if (firstRecipe && firstRecipe.inventory_items) {
          newMixtureStock = firstRecipe.inventory_items.stock ?? 0;
        }
      }
    } else {
      newMixtureStock = product.mixtureStock ?? 0;
    }

    return {
      ...product,
      stock: newStock,
      recipes: updatedRecipes,
      mixtureStock: newMixtureStock
    };
  });
}
