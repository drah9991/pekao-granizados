/**
 * Unit tests for pricing utilities.
 *
 * Run with: bun test src/lib/pricing.test.ts
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import {
  hasEnoughStock,
  hasEnoughStockForUpdate,
  applyPricingRules,
  resolveSize,
  itemVolumeMl,
} from "./pricing";
import type { Product, CartItem } from "./pos-types";
import type { PricingRuleRow } from "@/integrations/supabase/types-extensions";

// ============================================================
// Fixtures
// ============================================================

const emptyCart: CartItem[] = [];

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    name: "Test Granizado",
    price: 5000,
    category: "Granizado",
    type: "granizado",
    sku: null,
    description: null,
    active: true,
    images: null,
    variants: null,
    recipe: null,
    is_public: true,
    created_at: null,
    store_id: "store-1",
    cost: null,
    stock: 100,
    base_volume: 4,
    unit_measure: "oz",
    mixtureStock: 10000,
    has_recipe: true,
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: "cart-1",
    name: "Test Granizado",
    productId: "prod-1",
    price: 5000,
    quantity: 1,
    size: "Grande",
    sizeMultiplier: 1.5,
    maxStock: 100,
    isGranizado: true,
    mixtureStock: 10000,
    baseVolume: 4,
    productPrice: 5000,
    productType: "granizado",
    productCategory: "Granizado",
    ...overrides,
  };
}

// ============================================================
// hasEnoughStock
// ============================================================

describe("hasEnoughStock", () => {
  const product = makeProduct();
  // 4 oz * 1.5 mult * 29.57 ml/oz = 177.42 ml per unit
  // 10 units = 1774.2 ml, well under 10000 ml mixtureStock

  it("returns true when mixture stock is sufficient", () => {
    const result = hasEnoughStock(product, emptyCart, 10, 1.5, {
      track_mixture_inventory: true,
    });
    expect(result).toBe(true);
  });

  it("returns false when mixture stock is insufficient", () => {
    // 100 * 4oz * 1.5 mult * 29.57 = 17742 ml > 10000 ml
    const result = hasEnoughStock(product, emptyCart, 100, 1.5, {
      track_mixture_inventory: true,
    });
    expect(result).toBe(false);
  });

  it("returns true when type is granizado (auto-detected, no typeConfig)", () => {
    const result = hasEnoughStock(product, emptyCart, 5, 1.0);
    expect(result).toBe(true);
  });

  it("accounts for existing cart items consuming mixture stock", () => {
    const cart = [
      makeCartItem({
        id: "existing-1",
        quantity: 3,
        sizeMultiplier: 2.0,
        baseVolume: 4,
      }),
    ];
    // existing: 3 * 4oz * 2.0 * 29.57 = 709.68 ml
    // new: 50 * 4oz * 1.5 * 29.57 = 8871 ml
    // total: 9580.68 ml < 10000 ml => true
    const result = hasEnoughStock(product, cart, 50, 1.5, {
      track_mixture_inventory: true,
    });
    expect(result).toBe(true);
  });

  it("returns false when existing + new cart items exceed mixture stock", () => {
    const cart = [
      makeCartItem({
        id: "existing-1",
        quantity: 3,
        sizeMultiplier: 2.0,
        baseVolume: 4,
      }),
    ];
    // existing: 3 * 4oz * 2.0 * 29.57 = 709.68 ml
    // new: 55 * 4oz * 1.5 * 29.57 = 9758.1 ml
    // total: 10467.78 ml > 10000 ml => false
    const result = hasEnoughStock(product, cart, 55, 1.5, {
      track_mixture_inventory: true,
    });
    expect(result).toBe(false);
  });

  it("returns true for unit-stock tracking when stock is sufficient", () => {
    const unitProduct = makeProduct({
      type: "other",
      category: "Bebidas",
      mixtureStock: undefined,
      stock: 50,
    });
    const result = hasEnoughStock(unitProduct, emptyCart, 30, 1.0, {
      track_mixture_inventory: false,
    });
    expect(result).toBe(true);
  });

  it("returns false for unit-stock tracking when stock is insufficient", () => {
    const unitProduct = makeProduct({
      type: "other",
      category: "Bebidas",
      mixtureStock: undefined,
      stock: 10,
    });
    const result = hasEnoughStock(unitProduct, emptyCart, 20, 1.0, {
      track_mixture_inventory: false,
    });
    expect(result).toBe(false);
  });

  it("accounts for existing cart items in unit-stock mode", () => {
    const unitProduct = makeProduct({
      type: "other",
      category: "Bebidas",
      mixtureStock: undefined,
      stock: 10,
    });
    const cart = [
      makeCartItem({
        id: "existing-1",
        isGranizado: false,
        mixtureStock: undefined,
        quantity: 7,
      }),
    ];
    // existing 7 + new 5 = 12 > 10 => false
    const result = hasEnoughStock(unitProduct, cart, 5, 1.0, {
      track_mixture_inventory: false,
    });
    expect(result).toBe(false);
  });

  it("returns true when mixture stock is undefined (no stock tracking)", () => {
    const noStockProduct = makeProduct({
      mixtureStock: undefined,
      stock: undefined,
    });
    const result = hasEnoughStock(noStockProduct, emptyCart, 999, 1.0);
    expect(result).toBe(true);
  });
});

// ============================================================
// hasEnoughStockForUpdate
// ============================================================

describe("hasEnoughStockForUpdate", () => {
  it("returns true when new quantity fits within mixture stock", () => {
    const item = makeCartItem({ quantity: 1 });
    const result = hasEnoughStockForUpdate(item, emptyCart, 10);
    expect(result).toBe(true);
  });

  it("returns false when new quantity exceeds mixture stock", () => {
    const item = makeCartItem({ mixtureStock: 500, quantity: 1 });
    const cart = [item];
    // 10 items * 4oz * 1.5 * 29.57 = 1774.2 ml > 500 ml
    const result = hasEnoughStockForUpdate(item, cart, 10);
    expect(result).toBe(false);
  });

  it("accounts for other cart items when updating quantity", () => {
    const item = makeCartItem({
      id: "updating-item",
      quantity: 2,
      sizeMultiplier: 1.0,
      baseVolume: 4,
      mixtureStock: 500,
    });
    const cart = [
      makeCartItem({
        id: "updating-item",
        quantity: 2,
        sizeMultiplier: 1.0,
        baseVolume: 4,
        mixtureStock: 500,
      }),
      makeCartItem({
        id: "other-item",
        productId: "prod-1",
        quantity: 1,
        sizeMultiplier: 1.5,
        baseVolume: 4,
        mixtureStock: 500,
      }),
    ];
    // updating item: 2 items -> update to 3
    // other item: 1 item (unchanged)
    // total with update: (3 * 4oz * 1.0 * 29.57) + (1 * 4oz * 1.5 * 29.57) = 354.84 + 177.42 = 532.26 ml
    // > 500 ml => false
    const result = hasEnoughStockForUpdate(item, cart, 3);
    expect(result).toBe(false);
  });

  it("supports unit-stock items in update", () => {
    const item = makeCartItem({
      isGranizado: false,
      mixtureStock: undefined,
      maxStock: 10,
      quantity: 2,
    });
    const result = hasEnoughStockForUpdate(item, emptyCart, 8);
    expect(result).toBe(true);
  });

  it("returns false for unit-stock items exceeding max in update", () => {
    const item = makeCartItem({
      isGranizado: false,
      mixtureStock: undefined,
      maxStock: 10,
      quantity: 2,
    });
    const cart = [item];
    // 15 > 10 => false
    const result = hasEnoughStockForUpdate(item, cart, 15);
    expect(result).toBe(false);
  });

  it("returns true when mixtureStock is 0 (no mixture tracking for cart)", () => {
    const item = makeCartItem({
      isGranizado: false,
      mixtureStock: 0,
      maxStock: 100,
    });
    const result = hasEnoughStockForUpdate(item, emptyCart, 50);
    expect(result).toBe(true);
  });

  it("returns true when mixtureStock is undefined", () => {
    const item = makeCartItem({
      isGranizado: false,
      mixtureStock: undefined,
      maxStock: 100,
    });
    const result = hasEnoughStockForUpdate(item, emptyCart, 50);
    expect(result).toBe(true);
  });
});

// ============================================================
// applyPricingRules
// ============================================================

describe("applyPricingRules", () => {
  const context = {
    category: "Granizado",
    productId: "prod-1",
  };

  it("returns original price when no rules exist", () => {
    const result = applyPricingRules(5000, [], context);
    expect(result.discountedPrice).toBe(5000);
    expect(result.originalPrice).toBe(5000);
    expect(result.discountMessage).toBeUndefined();
  });

  it("applies a percentage discount correctly", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "10% OFF",
        type: "general",
        discount_type: "percentage",
        discount_value: 10,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(10000, rules, context);
    expect(result.discountedPrice).toBe(9000); // 10000 * 0.9
    expect(result.originalPrice).toBe(10000);
    expect(result.discountMessage).toBe("10% OFF");
  });

  it("applies a fixed discount correctly", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "$2000 OFF",
        type: "general",
        discount_type: "fixed",
        discount_value: 2000,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(5000, rules, context);
    expect(result.discountedPrice).toBe(3000); // 5000 - 2000
    expect(result.originalPrice).toBe(5000);
  });

  it("does not discount below zero for fixed discounts", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "Super Discount",
        type: "general",
        discount_type: "fixed",
        discount_value: 9999,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(1000, rules, context);
    expect(result.discountedPrice).toBe(0); // Math.max(0, 1000 - 9999)
    expect(result.originalPrice).toBe(1000);
  });

  it("picks the best (lowest) discount among multiple applicable rules", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "5% OFF",
        type: "general",
        discount_type: "percentage",
        discount_value: 5,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
      {
        id: "rule-2",
        store_id: "store-1",
        name: "20% OFF",
        type: "general",
        discount_type: "percentage",
        discount_value: 20,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
      {
        id: "rule-3",
        store_id: "store-1",
        name: "$1000 OFF",
        type: "general",
        discount_type: "fixed",
        discount_value: 1000,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(10000, rules, context);
    // 20% off: 8000 | $1000 off: 9000 | 5% off: 9500
    // Best: 8000
    expect(result.discountedPrice).toBe(8000);
    expect(result.discountMessage).toBe("20% OFF");
  });

  it("ignores rules for a different category", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "Bebidas Discount",
        type: "general",
        discount_type: "percentage",
        discount_value: 50,
        target_type: "category",
        target_id: "Bebidas", // doesn't match 'Granizado'
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(5000, rules, context);
    expect(result.discountedPrice).toBe(5000); // no discount applied
    expect(result.discountMessage).toBeUndefined();
  });

  it("ignores rules for a different product ID", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "Product Discount",
        type: "general",
        discount_type: "fixed",
        discount_value: 500,
        target_type: "product",
        target_id: "prod-999", // doesn't match 'prod-1'
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(5000, rules, context);
    expect(result.discountedPrice).toBe(5000);
    expect(result.discountMessage).toBeUndefined();
  });

  it("applies rules targeting a specific product", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "Prod-1 Special",
        type: "general",
        discount_type: "percentage",
        discount_value: 15,
        target_type: "product",
        target_id: "prod-1",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(2000, rules, context);
    expect(result.discountedPrice).toBe(1700); // 2000 * 0.85
    expect(result.discountMessage).toBe("Prod-1 Special");
  });

  it("returns original price when no rules match the current day", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-1",
        store_id: "store-1",
        name: "Impossible Day",
        type: "general",
        discount_type: "percentage",
        discount_value: 20,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: [8], // Day 8 doesn't exist, so this rule never applies
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(5000, rules, context);
    expect(result.discountedPrice).toBe(5000);
    expect(result.originalPrice).toBe(5000);
    expect(result.discountMessage).toBeUndefined();
  });

  it("applies category-wide rule when product-specific rule also exists", () => {
    const rules: PricingRuleRow[] = [
      {
        id: "rule-cat",
        store_id: "store-1",
        name: "Category 10%",
        type: "general",
        discount_type: "percentage",
        discount_value: 10,
        target_type: "category",
        target_id: "Granizado",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
      {
        id: "rule-prod",
        store_id: "store-1",
        name: "Product $500",
        type: "general",
        discount_type: "fixed",
        discount_value: 500,
        target_type: "product",
        target_id: "prod-1",
        days_of_week: null,
        start_time: null,
        end_time: null,
        active: true,
        created_at: null,
      },
    ];
    const result = applyPricingRules(10000, rules, context);
    // Category 10%: 9000 | Product $500: 9500
    // Best: 9000
    expect(result.discountedPrice).toBe(9000);
    expect(result.discountMessage).toBe("Category 10%");
  });
});

// ============================================================
// resolveSize
// ============================================================

describe("resolveSize", () => {
  const sizes = [
    { id: "small", name: "Pequeño", multiplier: 1.0 },
    { id: "medium", name: "Mediano", multiplier: 1.5 },
    { id: "large", name: "Grande", multiplier: 2.0 },
  ];

  it("returns null when sizes array is empty", () => {
    const result = resolveSize([]);
    expect(result).toBeNull();
  });

  it("returns null when sizes array is empty even with selectedSizeId", () => {
    const result = resolveSize([], "some-id");
    expect(result).toBeNull();
  });

  it("returns the first size when no selectedSizeId is provided", () => {
    const result = resolveSize(sizes);
    expect(result).toEqual(sizes[0]);
  });

  it("returns the matching size when selectedSizeId is valid", () => {
    const result = resolveSize(sizes, "large");
    expect(result).toEqual(sizes[2]);
  });

  it("returns null when selectedSizeId does not match any size", () => {
    const result = resolveSize(sizes, "nonexistent");
    expect(result).toBeNull();
  });

  it("returns the matching size from a single-element array", () => {
    const singleSize = [{ id: "only", name: "Único", multiplier: 1.0 }];
    const result = resolveSize(singleSize, "only");
    expect(result).toBeTruthy();
    expect(result!.id).toBe("only");
  });
});

// ============================================================
// itemVolumeMl
// ============================================================

describe("itemVolumeMl", () => {
  it("calculates volume correctly for base values", () => {
    // 4 oz * 1.0 mult * 29.57 * 1 qty = 118.28 ml
    const result = itemVolumeMl(4, 1.0, 1);
    expect(result).toBeCloseTo(118.28, 1);
  });

  it("scales with multiplier", () => {
    // 4 oz * 2.0 mult * 29.57 * 1 qty = 236.56 ml
    const result = itemVolumeMl(4, 2.0, 1);
    expect(result).toBeCloseTo(236.56, 1);
  });

  it("scales with quantity", () => {
    // 4 oz * 1.5 mult * 29.57 * 3 qty = 532.26 ml
    const result = itemVolumeMl(4, 1.5, 3);
    expect(result).toBeCloseTo(532.26, 1);
  });

  it("returns 0 when base volume is 0", () => {
    const result = itemVolumeMl(0, 1.5, 2);
    expect(result).toBe(0);
  });

  it("returns 0 when quantity is 0", () => {
    const result = itemVolumeMl(4, 1.0, 0);
    expect(result).toBe(0);
  });
});
