import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

import type { DailySummary, OrderDetail, OrderStatus, OrderSummary } from '../types';

const ORDER_LIST_LIMIT = 50;
const DAY_LIMIT = 1000;

interface OrderRow {
  id: string;
  created_at: string;
  status: OrderStatus;
  total: number | string;
  order_type: string | null;
  customers: { name: string | null; phone?: string | null } | null;
}

interface OrderDetailRow extends OrderRow {
  subtotal: number | string;
  tax: number | string | null;
  cancellation_reason: string | null;
  order_items: { id: string; name: string; qty: number | string; price: number | string; subtotal: number | string | null }[];
}

export const ordersKey = (storeId: string) => ['admin', 'orders', storeId] as const;

function toOrderSummary(row: OrderRow): OrderSummary {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    total: Number(row.total),
    orderType: row.order_type,
    customerName: row.customers?.name ?? null,
  };
}

export function useOrders(storeId: string, status: OrderStatus | 'all') {
  return useQuery({
    queryKey: [...ordersKey(storeId), status],
    queryFn: async (): Promise<OrderSummary[]> => {
      let query = supabase
        .from('orders')
        .select('id, created_at, status, total, order_type, customers(name)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(ORDER_LIST_LIMIT);
      if (status !== 'all') query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
      return (data as unknown as OrderRow[]).map(toOrderSummary);
    },
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: async (): Promise<OrderDetail> => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, created_at, status, subtotal, tax, total, order_type, cancellation_reason, customers(name, phone), order_items(id, name, qty, price, subtotal)',
        )
        .eq('id', orderId)
        .maybeSingle();
      if (error) throw new Error(`No se pudo cargar el pedido: ${error.message}`);
      if (!data) throw new Error('Pedido no encontrado o sin permiso para verlo.');

      const row = data as unknown as OrderDetailRow;
      return {
        ...toOrderSummary(row),
        subtotal: Number(row.subtotal),
        tax: Number(row.tax ?? 0),
        customerPhone: row.customers?.phone ?? null,
        cancellationReason: row.cancellation_reason,
        items: row.order_items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: Number(item.qty),
          price: Number(item.price),
          subtotal: Number(item.subtotal ?? Number(item.qty) * Number(item.price)),
        })),
      };
    },
  });
}

function startOfToday(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

export function useDailySummary(storeId: string) {
  return useQuery({
    queryKey: [...ordersKey(storeId), 'summary'],
    queryFn: async (): Promise<DailySummary> => {
      const { data, error } = await supabase
        .from('orders')
        .select('status, total')
        .eq('store_id', storeId)
        .gte('created_at', startOfToday())
        .limit(DAY_LIMIT);
      if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);

      const rows = (data ?? []) as { status: OrderStatus; total: number | string }[];
      return {
        orderCount: rows.length,
        pendingCount: rows.filter((row) => row.status === 'pending').length,
        cancelledCount: rows.filter((row) => row.status === 'cancelled').length,
        completedTotal: rows
          .filter((row) => row.status === 'completed')
          .reduce((total, row) => total + Number(row.total), 0),
      };
    },
  });
}

interface CancelInput {
  orderId: string;
  status: OrderStatus;
  reason: string;
  userId: string;
}

/**
 * Pendiente: aún no descontó inventario, basta con cambiar el estado.
 * Completado: se anula con la misma RPC del POS, que devuelve el inventario.
 */
async function cancelOrder({ orderId, status, reason, userId }: CancelInput): Promise<void> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) throw new Error('Escribe el motivo (mínimo 3 caracteres).');

  if (status === 'completed') {
    const { error } = await supabase.rpc('cancel_sale_with_stock_restore', {
      p_order_id: orderId,
      p_reason: trimmedReason,
    });
    if (error) throw new Error(error.message);
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancellation_reason: trimmedReason,
      cancelled_by: userId,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', status)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('El pedido cambió de estado o no tienes permiso para cancelarlo.');
}

export function useCancelOrder(storeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (_result, input) => {
      queryClient.invalidateQueries({ queryKey: ordersKey(storeId) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', input.orderId] });
    },
  });
}
