/**
 * Formato de la carta digital y utilidades puras (sin Supabase ni React).
 * La carta pública llega ya calculada desde la RPC get_digital_menu.
 */

export type StockStatus = "available" | "low_stock" | "out_of_stock";

/** Lo que la carta muestra de un producto. En modo admin además trae is_public. */
export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[] | null;
  is_starred: boolean | null;
  is_public?: boolean | null;
  stock_status: StockStatus;
  available_qty: number;
  min_qty?: number;
}

export interface MenuCategory {
  code: string;
  label: string;
  emoji_icon: string | null;
  items: MenuItem[];
}

const STOCK_STATUSES: readonly StockStatus[] = ["available", "low_stock", "out_of_stock"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function parseMenuItem(raw: unknown): MenuItem | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.name !== "string") return null;

  const price = toNumber(raw.price);
  const availableQty = toNumber(raw.available_qty);
  const status = STOCK_STATUSES.find((s) => s === raw.stock_status);
  if (price === null || availableQty === null || !status) return null;

  const minQty = toNumber(raw.min_qty);
  const images = Array.isArray(raw.images) ? raw.images.filter((img): img is string => typeof img === "string") : null;

  return {
    id: raw.id,
    name: raw.name,
    description: typeof raw.description === "string" ? raw.description : null,
    price,
    images,
    is_starred: raw.is_starred === true,
    stock_status: status,
    available_qty: availableQty,
    ...(minQty === null ? {} : { min_qty: minQty }),
  };
}

/**
 * Valida la respuesta de get_digital_menu. Descarta lo que no tenga la forma
 * esperada en lugar de romper la carta; devuelve solo categorías con productos.
 */
export function parsePublicMenu(data: unknown): MenuCategory[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((raw): MenuCategory[] => {
    if (!isRecord(raw) || typeof raw.code !== "string" || typeof raw.label !== "string") return [];
    const items = Array.isArray(raw.items)
      ? raw.items.map(parseMenuItem).filter((item): item is MenuItem => item !== null)
      : [];
    if (items.length === 0) return [];
    return [
      {
        code: raw.code,
        label: raw.label,
        emoji_icon: typeof raw.emoji_icon === "string" ? raw.emoji_icon : null,
        items,
      },
    ];
  });
}

/**
 * Ordena las categorías según el orden guardado (JSON con códigos). Las que no
 * aparecen van al final en su orden original. Un JSON inválido no cambia nada.
 */
export function sortByCategoryOrder(categories: MenuCategory[], savedOrderJson: string | null): MenuCategory[] {
  if (!savedOrderJson) return categories;

  let savedOrder: unknown;
  try {
    savedOrder = JSON.parse(savedOrderJson);
  } catch {
    return categories;
  }
  if (!Array.isArray(savedOrder)) return categories;

  const position = (code: string) => {
    const index = savedOrder.indexOf(code);
    return index === -1 ? Number.POSITIVE_INFINITY : index;
  };
  return [...categories].sort((a, b) => position(a.code) - position(b.code));
}
