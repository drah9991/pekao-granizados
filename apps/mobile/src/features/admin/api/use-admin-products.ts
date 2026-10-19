import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { productsQueryKey } from '@/features/catalog/api/use-products';
import { supabase } from '@/lib/supabase';

import type { AdminProduct, ProductPatch } from '../types';

const MAX_PRICE = 10_000_000;

interface ProductRow {
  id: string;
  name: string;
  price: number | string;
  active: boolean | null;
  is_public: boolean | null;
  type: string | null;
  category: string | null;
}

const adminProductsKey = (storeId: string) => ['admin', 'products', storeId] as const;

export function useAdminProducts(storeId: string) {
  return useQuery({
    queryKey: adminProductsKey(storeId),
    queryFn: async (): Promise<AdminProduct[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, active, is_public, type, category')
        .or(`store_id.eq.${storeId},store_id.is.null`)
        .order('name');
      if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);

      return ((data ?? []) as ProductRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price),
        isActive: row.active !== false,
        isPublic: row.is_public !== false,
        type: row.type,
        category: row.category,
      }));
    },
  });
}

export function validatePrice(value: string): number | string {
  const price = Number(value.replace(/[.\s]/g, '').replace(',', '.'));
  if (!Number.isFinite(price) || price <= 0) return 'Escribe un precio mayor que 0.';
  if (price > MAX_PRICE) return 'El precio es demasiado alto.';
  return Math.round(price);
}

export function useUpdateProduct(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, patch }: { productId: string; patch: ProductPatch }) => {
      const { data, error } = await supabase.from('products').update(patch).eq('id', productId).select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('No tienes permiso para editar este producto.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminProductsKey(storeId) });
      queryClient.invalidateQueries({ queryKey: productsQueryKey });
    },
  });
}
