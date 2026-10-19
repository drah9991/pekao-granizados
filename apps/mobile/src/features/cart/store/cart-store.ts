import 'expo-sqlite/localStorage/install';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from '@/features/catalog/types';

export interface CartLine {
  /** Hoy es el id del producto; con tamaños/toppings será `${productId}:${sizeId}:${toppingIds}`. */
  lineId: string;
  productId: string;
  name: string;
  /** Solo para mostrar. El total definitivo lo recalcula el servidor al crear el pedido. */
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: Product) => void;
  changeQuantity: (lineId: string, delta: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
}

function toCartLine(product: Product): CartLine {
  return {
    lineId: product.id,
    productId: product.id,
    name: product.name,
    unitPrice: product.price,
    imageUrl: product.imageUrl,
    quantity: 1,
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (product) =>
        set(({ lines }) => {
          const exists = lines.some((line) => line.lineId === product.id);
          return {
            lines: exists
              ? lines.map((line) =>
                  line.lineId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
                )
              : [...lines, toCartLine(product)],
          };
        }),
      changeQuantity: (lineId, delta) =>
        set(({ lines }) => ({
          lines: lines
            .map((line) => (line.lineId === lineId ? { ...line, quantity: line.quantity + delta } : line))
            .filter((line) => line.quantity > 0),
        })),
      remove: (lineId) => set(({ lines }) => ({ lines: lines.filter((line) => line.lineId !== lineId) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: 'pekao-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ lines }) => ({ lines }),
    },
  ),
);

// Selectores: cada componente se suscribe solo a lo que usa.
export const selectLines = (state: CartState): CartLine[] => state.lines;

export const selectItemCount = (state: CartState): number =>
  state.lines.reduce((count, line) => count + line.quantity, 0);

export const selectSubtotal = (state: CartState): number =>
  state.lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);

export const selectQuantityOf =
  (lineId: string) =>
  (state: CartState): number =>
    state.lines.find((line) => line.lineId === lineId)?.quantity ?? 0;
