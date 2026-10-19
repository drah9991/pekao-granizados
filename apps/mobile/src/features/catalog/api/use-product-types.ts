import { useQuery } from '@tanstack/react-query';

import { STORE_ID } from '@/lib/config';
import { supabase } from '@/lib/supabase';

import type { ProductTypeInfo } from '../product-filters';

const ONE_HOUR = 60 * 60_000;

interface ProductTypeRow {
  code: string;
  label: string | null;
  emoji_icon: string | null;
}

/** Etiquetas y emojis de los tipos de producto (configuración pública del POS). */
export function useProductTypes() {
  return useQuery({
    queryKey: ['catalog', 'product-types', STORE_ID],
    staleTime: ONE_HOUR,
    queryFn: async (): Promise<ProductTypeInfo[]> => {
      const { data, error } = await supabase
        .from('product_types_config')
        .select('code, label, emoji_icon')
        .eq('active', true)
        .or(`store_id.eq.${STORE_ID},store_id.is.null`);
      // Sin configuración se usan los nombres por defecto; no bloquea el menú.
      if (error) return [];

      return ((data ?? []) as ProductTypeRow[]).map((row) => ({
        code: row.code,
        label: row.label ?? row.code,
        emoji: row.emoji_icon ?? '🥤',
      }));
    },
  });
}
