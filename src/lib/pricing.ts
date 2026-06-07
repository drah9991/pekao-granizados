/**
 * Pricing utility functions — extracted from useCartStore to reduce duplication.
 * Handles discount rules, stock validation, and price calculation for cart items.
 */

import type { CartItem, Product } from "@/lib/pos-types";
import type { Tables } from "@/integrations/supabase/types";
import type { PricingRuleRow } from "@/integrations/supabase/types-extensions";

const OZ_TO_ML = 29.57;

// ============================================================
// Stock validation
// ============================================================

/**
 * Checks whether there's enough mixture or unit stock to add a product to cart.
 * Returns `true` if there is enough stock, `false` if not.
 */
export function hasEnoughStock(
  product: Product,
  cart: CartItem[],
  quantity: number,
  sizeMultiplier: number,
  typeConfig?: { track_mixture_inventory?: boolean } | null,
): boolean {
  const trackMixture =
    typeConfig?.track_mixture_inventory ||
    product.type === "granizado" ||
    product.category === "Granizado";

  if (trackMixture && product.mixtureStock !== undefined && product.mixtureStock > 0) {
    const baseVol = Number(product.base_volume) || 4;
    const requestedMl = baseVol * sizeMultiplier * OZ_TO_ML * quantity;
    const currentMlInCart = cart
      .filter((i) => i.productId === product.id)
      .reduce(
        (sum, i) =>
          sum + i.quantity * (i.baseVolume || 4) * (i.sizeMultiplier || 1) * OZ_TO_ML,
        0,
      );

    if (currentMlInCart + requestedMl > product.mixtureStock) return false;
  } else if (!trackMixture && product.stock !== undefined) {
    const currentQty = cart.reduce(
      (sum, i) => (i.productId === product.id ? sum + i.quantity : sum),
      0,
    );
    if (currentQty + quantity > product.stock) return false;
  }

  return true;
}

/**
 * Checks mixture stock during quantity update.
 */
export function hasEnoughStockForUpdate(
  item: CartItem,
  cart: CartItem[],
  newQuantity: number,
): boolean {
  if (item.isGranizado && item.mixtureStock !== undefined && item.mixtureStock > 0) {
    const currentMlTotal = cart
      .filter((i) => i.productId === item.productId)
      .reduce((sum, i) => {
        const qty = i.id === item.id ? newQuantity : i.quantity;
        return sum + qty * (i.baseVolume || 4) * (i.sizeMultiplier || 1) * OZ_TO_ML;
      }, 0);

    if (currentMlTotal > item.mixtureStock) return false;
  } else if (item.maxStock !== undefined) {
    const currentTotal = cart.reduce((sum, i) => {
      const qty = i.id === item.id ? newQuantity : i.quantity;
      return i.productId === item.productId ? sum + qty : sum;
    }, 0);

    if (currentTotal > item.maxStock) return false;
  }

  return true;
}

// ============================================================
// Pricing rules
// ============================================================

export interface AppliedDiscount {
  discountedPrice: number;
  originalPrice: number;
  discountMessage?: string;
}

/**
 * Apply active pricing rules to a base price.
 * Returns the best discounted price and an optional message.
 */
export function applyPricingRules(
  basePrice: number,
  rules: PricingRuleRow[],
  context: {
    category: string | null;
    productId: string;
  },
): AppliedDiscount {
  if (rules.length === 0) {
    return { discountedPrice: basePrice, originalPrice: basePrice };
  }

  const now = new Date();
  const jsDay = now.getDay();
  const currentDay = jsDay === 0 ? 7 : jsDay;
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`;

  const applicableRules = rules.filter((rule) => {
    if (
      rule.days_of_week &&
      rule.days_of_week.length > 0 &&
      !rule.days_of_week.includes(currentDay)
    ) {
      return false;
    }
    if (rule.type === "time_based" && rule.start_time && rule.end_time) {
      if (currentTime < rule.start_time || currentTime > rule.end_time) return false;
    }
    if (rule.target_type === "category" && context.category !== rule.target_id) return false;
    if (rule.target_type === "product" && context.productId !== rule.target_id) return false;
    return true;
  });

  if (applicableRules.length === 0) {
    return { discountedPrice: basePrice, originalPrice: basePrice };
  }

  let bestDiscountedPrice = basePrice;
  let bestRule: PricingRuleRow | null = null;

  for (const rule of applicableRules) {
    let discountedPrice = basePrice;
    if (rule.discount_type === "percentage") {
      discountedPrice = basePrice * (1 - rule.discount_value / 100);
    } else if (rule.discount_type === "fixed") {
      discountedPrice = Math.max(0, basePrice - rule.discount_value);
    }

    if (discountedPrice < bestDiscountedPrice) {
      bestDiscountedPrice = discountedPrice;
      bestRule = rule;
    }
  }

  const discountMessage = bestRule && bestDiscountedPrice < basePrice
    ? bestRule.name
    : undefined;

  return {
    discountedPrice: bestDiscountedPrice,
    originalPrice: basePrice,
    discountMessage,
  };
}

// ============================================================
// Cart item helpers
// ============================================================

/**
 * Calculate the total volume in ml consumed by a cart item.
 */
export function itemVolumeMl(
  baseVolume: number,
  sizeMultiplier: number,
  quantity: number,
): number {
  return baseVolume * sizeMultiplier * OZ_TO_ML * quantity;
}

/**
 * Find the best size from available sizes for a product.
 * Returns the default first size if none selected.
 */
export function resolveSize(
  sizes: Tables<"sizes">[],
  selectedSizeId?: string,
): Tables<"sizes"> | null {
  if (selectedSizeId) {
    return sizes.find((s) => s.id === selectedSizeId) || null;
  }
  return sizes.length > 0 ? sizes[0] : null;
}

export interface CalculatedPrice {
  finalPrice: number;
  basePrice: number;
  discountedPrice: number;
  originalPrice: number;
  discountMessage?: string;
  enabled?: boolean;
}

/**
 * Calculates the final, base, and original prices for a product, taking into account
 * custom size-specific pricing (variants JSON), standard size multipliers, toppings,
 * and active pricing rules (discounts).
 */
export function calculateItemPrice(
  product: Product,
  size: Tables<"sizes"> | null | undefined,
  toppings: Product[],
  pricingRules: PricingRuleRow[],
): CalculatedPrice {
  let enabled = true;
  // 1. Determine base price of the item (supports specific override prices in variants JSON)
  let basePrice = product.price * (size?.multiplier || 1);

  if (product.variants && Array.isArray(product.variants) && size) {
    const customVariant = (product.variants as any[]).find(
      (v) => v.size_id === size.id || v.size === size.name || v.id === size.id
    );
    if (customVariant) {
      if (customVariant.enabled === false) {
        enabled = false;
      }
      if (typeof customVariant.price === 'number') {
        basePrice = customVariant.price;
      }
    } else {
      // If custom pricing is active but this size is not in the JSON list, it is disabled
      enabled = false;
    }
  }

  // 2. Apply active pricing rules (discounts)
  const { discountedPrice, originalPrice: discountedOriginal, discountMessage } = applyPricingRules(
    basePrice,
    pricingRules,
    { category: product.category || null, productId: product.id }
  );

  // 3. Sum toppings
  const toppingsPrice = toppings.reduce((sum, t) => sum + t.price, 0);
  const finalPrice = discountedPrice + toppingsPrice;
  const originalPrice = discountedOriginal + toppingsPrice;

  return {
    finalPrice,
    basePrice,
    discountedPrice,
    originalPrice,
    discountMessage,
    enabled,
  };
}

