import type { Product } from "@/lib/pos-types";

/** Categoría del catálogo tal como la usa la grilla del POS. */
export interface GridCategory {
  code: string;
  label: string;
  emoji: string;
  trackMixture: boolean;
}

export const ALL_CATEGORIES = "all";

type GridProduct = Product & { is_starred?: boolean | null };

const lower = (value: string | null | undefined) => (value ?? "").toLowerCase();

function matchesCategory(product: GridProduct, categoryCode: string, categoryName: string) {
  if (categoryCode === ALL_CATEGORIES) return true;
  const code = lower(categoryCode);
  const name = lower(categoryName);
  return (
    product.category_id === categoryCode ||
    product.type === categoryCode ||
    (!!product.category && lower(product.category) === name) ||
    (!!product.type && (lower(product.type) === code || lower(product.type) === name))
  );
}

/** Filtra por texto (nombre o categoría) y por categoría; los destacados van primero. */
export function filterProducts<T extends GridProduct>(
  products: T[],
  query: string,
  categoryCode: string,
  categories: GridCategory[],
): T[] {
  const search = lower(query);
  const categoryName = categories.find((c) => c.code === categoryCode)?.label ?? categoryCode;

  return products
    .filter(
      (product) =>
        (lower(product.name).includes(search) || lower(product.category).includes(search)) &&
        matchesCategory(product, categoryCode, categoryName),
    )
    .sort((a, b) => Number(!!b.is_starred) - Number(!!a.is_starred));
}
