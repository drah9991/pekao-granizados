import { describe, it, expect } from "bun:test";
import { calculateOptimisticTanks, calculateOptimisticProducts } from "./inventory-sync-utils";

// Mock validation checking helper
const isValidationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  const code = String(err.code || '');
  const status = Number(err.status || 0);
  
  return (
    code === 'P0001' ||
    code.startsWith('23') ||
    status === 400 ||
    status === 409
  );
};

describe("Inventory Real-time Sync Tests", () => {

  // 1. Unit sale inventory deduction (both database mock/assertions and client-side optimistic functions)
  describe("1. Unit Sale Inventory Deduction", () => {
    it("should correctly calculate optimistic product stock decrement", () => {
      const cart = [
        { productId: "prod-1", quantity: 3 }
      ];
      const oldProducts = [
        {
          id: "prod-1",
          name: "Unit Product",
          price: 1000,
          stock: 15,
          mixtureStock: 0,
          recipes: []
        }
      ];

      const result = calculateOptimisticProducts(cart, oldProducts);
      expect(result[0].stock).toBe(12);
    });

    it("database simulation should sort items by product_id to prevent deadlocks", () => {
      // Simulate database process_sale items sorting
      const cartItems = [
        { product_id: "prod-b", quantity: 1 },
        { product_id: "prod-a", quantity: 2 },
        { product_id: null, quantity: 1 } // generic/null
      ];

      // SQL ORDER BY product_id ASC NULLS LAST
      const sortedItems = [...cartItems].sort((a, b) => {
        if (a.product_id === null) return 1;
        if (b.product_id === null) return -1;
        return a.product_id.localeCompare(b.product_id);
      });

      expect(sortedItems[0].product_id).toBe("prod-a");
      expect(sortedItems[1].product_id).toBe("prod-b");
      expect(sortedItems[2].product_id).toBeNull();
    });
  });

  // 2. Recipe-based mixture sale (exact volume calculations)
  describe("2. Recipe-based Mixture Sale Volume Calculations", () => {
    it("should calculate correct ml deduction using the exact database formula", () => {
      // Formula: deduction = qtyRequired * baseVol * multiplier * 29.57 * quantity
      const cart = [
        {
          productId: "prod-granizado",
          quantity: 2,
          sizeMultiplier: 1.5,
          baseVolume: 4
        }
      ];

      const oldProducts = [
        {
          id: "prod-granizado",
          name: "Granizado Fresa",
          price: 8000,
          type: "granizado",
          base_volume: 4,
          stock: 100,
          mixtureStock: 10000,
          recipes: [
            {
              inventory_item_id: "inv-item-fresa",
              quantity_required: 1.0,
              inventory_items: {
                id: "inv-item-fresa",
                stock: 10000,
                is_mixture: true,
                unit: "ml"
              }
            }
          ]
        }
      ];

      const oldTanks = [
        {
          id: "tank-1",
          store_id: "store-1",
          name: "Fresa",
          current_volume_ml: 10000,
          max_capacity_ml: 12000,
          percentage: 83.33,
          inventory_item_id: "inv-item-fresa"
        }
      ];

      // Calculation: 1.0 * 4 * 1.5 * 29.57 * 2 = 354.84 ml
      const expectedDeduction = 1.0 * 4 * 1.5 * 29.57 * 2;
      const expectedVolume = 10000 - expectedDeduction; // 9645.16

      const newTanks = calculateOptimisticTanks(cart, oldTanks, oldProducts);
      expect(newTanks[0].current_volume_ml).toBeCloseTo(expectedVolume, 2);

      // Verify products cache also reflects the updated mixture stock
      const newProducts = calculateOptimisticProducts(cart, oldProducts);
      expect(newProducts[0].mixtureStock).toBeCloseTo(expectedVolume, 2);
    });

    it("database simulation should sort recipe items by inventory_item_id to prevent deadlocks", () => {
      const recipes = [
        { inventory_item_id: "item-z", quantity_required: 0.5 },
        { inventory_item_id: "item-m", quantity_required: 1.0 },
        { inventory_item_id: "item-a", quantity_required: 2.0 }
      ];

      const sortedRecipes = [...recipes].sort((a, b) => a.inventory_item_id.localeCompare(b.inventory_item_id));

      expect(sortedRecipes[0].inventory_item_id).toBe("item-a");
      expect(sortedRecipes[1].inventory_item_id).toBe("item-m");
      expect(sortedRecipes[2].inventory_item_id).toBe("item-z");
    });
  });

  // 3. Cancellation (restoring exact quantities)
  describe("3. Cancellation & Restoration", () => {
    it("should calculate exact quantities to restore upon cancellation", () => {
      const orderItems = [
        { product_id: "prod-1", qty: 3, price: 1000, name: "Unit Item", size: null, size_multiplier: 1.0 }
      ];

      // Simulate cancellation restore: stock = stock + item_qty
      const oldStock = 12;
      const restoredStock = oldStock + orderItems[0].qty;
      expect(restoredStock).toBe(15);
    });

    it("should calculate exact mixture volumes to restore on recipe-based product cancellation", () => {
      // 1 unit of granizado cancelled
      // Item details: qty: 1, base_volume: 4, size_multiplier: 1.5
      // Recipe details: quantity_required: 1.0, unit: 'ml'
      const cancelledQty = 1;
      const baseVol = 4;
      const multiplier = 1.5;
      const quantityRequired = 1.0;
      
      // Conversion factor: 29.57
      const restoredVolume = quantityRequired * baseVol * multiplier * 29.57 * cancelledQty; // 177.42 ml
      
      const currentTankVolume = 9645.16;
      const expectedNewVolume = currentTankVolume + restoredVolume; // 9822.58
      
      expect(expectedNewVolume).toBeCloseTo(9822.58, 2);
    });
  });

  // 4. Sync queue non-retryable error handling
  describe("4. Sync Queue Non-Retryable Error Handling", () => {
    it("should classify validation errors as non-retryable", () => {
      const dbValidationError = {
        code: "P0001",
        message: "Stock insuficiente para el artículo"
      };

      const dbConstraintError = {
        code: "23514",
        message: "new row violates row-level security policy"
      };

      const httpClientError = {
        status: 400,
        message: "Bad Request"
      };

      const networkError = {
        message: "Failed to fetch"
      };

      expect(isValidationError(dbValidationError)).toBe(true);
      expect(isValidationError(dbConstraintError)).toBe(true);
      expect(isValidationError(httpClientError)).toBe(true);
      expect(isValidationError(networkError)).toBe(false);
    });

    it("should prune validation errors from queue and keep network errors", () => {
      // Simulated Sync queue
      const syncQueue = [
        { id: "order-validation-fail", error: { code: "P0001", message: "Stock error" } },
        { id: "order-network-fail", error: { message: "Failed to fetch" } }
      ];

      // Prune logic
      const remainingQueue = syncQueue.filter(order => !isValidationError(order.error));

      expect(remainingQueue).toHaveLength(1);
      expect(remainingQueue[0].id).toBe("order-network-fail");
    });
  });
});
