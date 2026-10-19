import { useQuery } from '@tanstack/react-query';

import { STORE_ID } from '@/lib/config';
import { supabase } from '@/lib/supabase';

import type { MenuRow, Product } from '../types';

const FIVE_MINUTES = 5 * 60_000;
const MENU_COLUMNS = 'id, name, description, price, images, category, type, store_id';

export const productsQueryKey = ['catalog', 'products', STORE_ID] as const;

export function toProduct(row: MenuRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.images?.[0] ?? null,
    category: row.category,
    type: row.type,
  };
}

async function fetchMenu(): Promise<Product[]> {
  // Productos de la sede más los globales (store_id nulo).
  const { data, error } = await supabase
    .from('public_menu')
    .select(MENU_COLUMNS)
    .neq('type', 'topping')
    .or(`store_id.eq.${STORE_ID},store_id.is.null`)
    .order('name');

  if (error) {
    throw new Error(`No se pudo cargar el menú: ${error.message}`);
  }

  const rows: MenuRow[] = data ?? [];
  return rows.map(toProduct).filter((product) => Number.isFinite(product.price));
}

export function useProducts() {
  return useQuery({
    queryKey: productsQueryKey,
    queryFn: fetchMenu,
    staleTime: FIVE_MINUTES,
  });
}
