export type ProductType = 'granizado' | 'topping' | 'sachet' | 'sweet' | 'combo';

/** Fila de la vista `public_menu` (solo columnas de vitrina). */
export interface MenuRow {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  images: string[] | null;
  category: string | null;
  type: ProductType;
  store_id: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string | null;
  type: ProductType;
}
