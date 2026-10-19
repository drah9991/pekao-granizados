import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CartLine } from '@/features/cart/store/cart-store';
import { productsQueryKey } from '@/features/catalog/api/use-products';
import { STORE_ID } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export interface CreatedOrder {
  orderId: string;
  total: number;
  createdAt: string;
  isDuplicate: boolean;
}

interface CreateOrderInput {
  lines: CartLine[];
  /** Misma clave en cada reintento: el servidor devuelve el pedido ya creado. */
  idempotencyKey: string;
}

interface CreateOrderResponse {
  order_id: string;
  total: number | string;
  created_at: string;
  is_duplicate: boolean;
}

const PRODUCT_UNAVAILABLE = 'ya no está disponible';

async function createOrder({ lines, idempotencyKey }: CreateOrderInput): Promise<CreatedOrder> {
  if (lines.length === 0) throw new Error('Tu carrito está vacío.');

  // Solo se envían productos y cantidades: el servidor pone los precios.
  const items = lines.map((line) => ({ product_id: line.productId, qty: line.quantity }));

  const { data, error } = await supabase.rpc('create_mobile_order', {
    p_store_id: STORE_ID,
    p_items: items,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw new Error(error.message);

  const response = data as CreateOrderResponse;
  return {
    orderId: response.order_id,
    total: Number(response.total),
    createdAt: response.created_at,
    isDuplicate: response.is_duplicate,
  };
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onError: (error) => {
      // Si un producto dejó de estar disponible, refrescar el menú.
      if (error.message.includes(PRODUCT_UNAVAILABLE)) {
        queryClient.invalidateQueries({ queryKey: productsQueryKey });
      }
    },
  });
}
