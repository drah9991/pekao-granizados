import type { CartItem, Product } from "@/lib/pos-types";
import { calculateItemPrice } from "@/lib/pricing";

export interface SizeOption {
  id: string;
  name: string;
  multiplier: number;
}

type PricingSize = Parameters<typeof calculateItemPrice>[1];

/** Sachets y dulces tienen un tamaño fijo: se muestra como etiqueta, no como opciones. */
export const hasSizeOptions = (item: CartItem) => item.productType !== "sachet" && item.productType !== "sweet";

/**
 * Tamaños que el ítem puede tomar. Si el producto tiene precios por tamaño (variants), un tamaño
 * que no aparece en ellos o está deshabilitado no se ofrece; la regla vive en calculateItemPrice.
 */
export function enabledSizesFor(item: CartItem, sizes: SizeOption[]): SizeOption[] {
  const product = {
    id: item.productId,
    price: item.productPrice ?? item.price,
    category: item.productCategory || null,
    type: (item.productType || "granizado") as Product["type"],
    variants: item.variants || null,
  } as Product;

  return sizes.filter((size) => calculateItemPrice(product, size as PricingSize, [], []).enabled !== false);
}

/** Id del tamaño actual del ítem (se guarda por nombre en el carrito). */
export const currentSizeId = (item: CartItem, sizes: SizeOption[]) =>
  sizes.find((size) => size.name === item.size)?.id || "";

export const toppingIdsOf = (item: CartItem) => item.toppings?.map((topping) => topping.id) || [];
