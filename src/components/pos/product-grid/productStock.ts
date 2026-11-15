import type { Product } from "@/lib/pos-types";

export type StockLevel = "out" | "low" | "medium" | "high";

// Umbrales sin cambios respecto a la versión anterior del POS.
const MIXTURE_LOW_ML = 2000;
const MIXTURE_MEDIUM_ML = 5000;
const UNITS_LOW = 10;
const UNITS_MEDIUM = 20;

const levelFor = (amount: number, low: number, medium: number): StockLevel => {
  if (amount <= 0) return "out";
  if (amount < low) return "low";
  if (amount < medium) return "medium";
  return "high";
};

const inRange = (amount: number | undefined, from: number, to: number) =>
  amount !== undefined && amount >= from && amount < to;

/**
 * Nivel de stock de un producto del POS (misma regla que la versión anterior del POS).
 * - Categorías con inventario de mezcla: según los ml de mezcla disponibles.
 * - El resto: unidades y mezcla cuentan a la vez; gana el nivel más bajo (agotado > bajo > medio).
 */
export function getStockLevel(product: Product, tracksMixture: boolean): StockLevel {
  const mixture = product.mixtureStock;
  if (tracksMixture) {
    return mixture === undefined ? "out" : levelFor(mixture, MIXTURE_LOW_ML, MIXTURE_MEDIUM_ML);
  }
  const units = product.stock || 0;
  const hasMixture = mixture !== undefined && mixture > 0;
  if (units <= 0 && !hasMixture) return "out";
  if ((units > 0 && units < UNITS_LOW) || (hasMixture && inRange(mixture, 0, UNITS_LOW))) return "low";
  if (inRange(units, UNITS_LOW, UNITS_MEDIUM) || inRange(mixture, UNITS_LOW, UNITS_MEDIUM)) return "medium";
  return "high";
}

/** Texto del indicador de stock: litros de mezcla o unidades. */
export function stockLabel(product: Product, tracksMixture: boolean): string {
  if (tracksMixture) return `${((product.mixtureStock ?? 0) / 1000).toFixed(1)}L`;
  return String(product.stock || product.mixtureStock || 0);
}
