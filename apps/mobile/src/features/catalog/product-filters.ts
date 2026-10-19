import type { Product, ProductType } from './types';

export interface ProductTypeInfo {
  code: string;
  label: string;
  emoji: string;
}

/** Respaldo si la configuración de tipos no se puede leer. */
const FALLBACK_TYPES: Record<ProductType, Omit<ProductTypeInfo, 'code'>> = {
  granizado: { label: 'Granizados', emoji: '🍧' },
  sachet: { label: 'Sachets', emoji: '🥃' },
  sweet: { label: 'Dulces', emoji: '🍬' },
  combo: { label: 'Combos', emoji: '🍱' },
  topping: { label: 'Toppings', emoji: '🍫' },
};

const DEFAULT_EMOJI = '🥤';

/** Nombre en singular para la etiqueta de cada producto ("Granizado", no "Granizados"). */
const SINGULAR_LABELS: Record<ProductType, string> = {
  granizado: 'Granizado',
  sachet: 'Sachet',
  sweet: 'Dulce',
  combo: 'Combo',
  topping: 'Topping',
};

export function typeInfoFor(code: string, configured: ProductTypeInfo[]): ProductTypeInfo {
  const match = configured.find((type) => type.code === code);
  if (match) return match;
  const fallback = FALLBACK_TYPES[code as ProductType];
  return { code, label: fallback?.label ?? code, emoji: fallback?.emoji ?? DEFAULT_EMOJI };
}

/** Etiqueta del tipo para mostrar en la tarjeta de un producto. */
export function typeBadgeFor(code: string, configured: ProductTypeInfo[]): { emoji: string; label: string } {
  const info = typeInfoFor(code, configured);
  return { emoji: info.emoji, label: SINGULAR_LABELS[code as ProductType] ?? info.label };
}

/** Minúsculas y sin tildes: "Café" y "cafe" coinciden. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface ProductFilter {
  query: string;
  /** Código de tipo, o 'all' para todos. */
  type: string;
}

export function filterProducts(products: Product[], { query, type }: ProductFilter): Product[] {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);

  return products.filter((product) => {
    if (type !== 'all' && product.type !== type) return false;
    if (terms.length === 0) return true;
    const haystack = normalizeText(`${product.name} ${product.description ?? ''} ${product.category ?? ''}`);
    return terms.every((term) => haystack.includes(term));
  });
}

/** Tipos presentes en el catálogo, en el orden de la configuración, con su cantidad. */
export function availableTypes(
  products: Product[],
  configured: ProductTypeInfo[],
): (ProductTypeInfo & { count: number })[] {
  const counts = new Map<string, number>();
  for (const product of products) counts.set(product.type, (counts.get(product.type) ?? 0) + 1);

  const order = configured.map((type) => type.code);
  const position = (code: string) => {
    const index = order.indexOf(code);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  };

  return [...counts.entries()]
    .sort(([a], [b]) => position(a) - position(b))
    .map(([code, count]) => ({ ...typeInfoFor(code, configured), count }));
}
