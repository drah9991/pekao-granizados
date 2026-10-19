import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { FormField } from '@/components/form-field';
import { ScreenContainer } from '@/components/screen-container';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAdminScope } from '@/features/admin/api/use-admin-scope';
import { useCancelOrder, useOrder } from '@/features/admin/api/use-orders';
import { StatusBadge } from '@/features/admin/components/status-badge';
import type { OrderDetail } from '@/features/admin/types';
import { canVoidSales, type Access } from '@/features/auth/types';
import { formatDateTime, formatPrice } from '@/lib/format';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cancelLabel(order: OrderDetail): string | null {
  if (order.status === 'pending' || order.status === 'processing') return 'Cancelar pedido';
  if (order.status === 'completed') return 'Anular venta y devolver inventario';
  return null;
}

function canCancel(order: OrderDetail, access: Access | null): boolean {
  if (!access) return false;
  // Anular una venta completada requiere admin o gerente (igual que en el POS).
  return order.status === 'completed' ? canVoidSales(access) : true;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isValidId = typeof id === 'string' && UUID_PATTERN.test(id);

  if (!isValidId) return <Redirect href="/admin/orders" />;
  return <OrderDetailView orderId={id} />;
}

function OrderDetailView({ orderId }: { orderId: string }) {
  const { access, storeId } = useAdminScope();
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId);
  const cancelOrder = useCancelOrder(storeId);
  const [reason, setReason] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  if (isPending) return <StateMessage isLoading message="Cargando pedido…" />;
  if (isError) return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;

  const actionLabel = cancelLabel(order);
  const isAllowed = canCancel(order, access);

  const handleConfirm = () => {
    if (!access) return;
    cancelOrder.mutate(
      { orderId: order.id, status: order.status, reason, userId: access.userId },
      { onSuccess: () => setIsConfirming(false) },
    );
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <View style={styles.header}>
        <StatusBadge status={order.status} />
        <ThemedText type="subtitle">{formatPrice(order.total)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateTime(order.createdAt)} · #{order.id.slice(0, 8)} ·{' '}
          {order.orderType === 'delivery' ? 'Domicilio' : 'Recoger en sede'}
        </ThemedText>
        <ThemedText type="small">
          {order.customerName ?? 'Cliente sin cuenta'}
          {order.customerPhone ? ` · ${order.customerPhone}` : ''}
        </ThemedText>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <ThemedText type="small" style={styles.itemName}>
              {item.qty} × {item.name}
            </ThemedText>
            <ThemedText type="small">{formatPrice(item.subtotal)}</ThemedText>
          </View>
        ))}
        <View style={[styles.itemRow, styles.totalRow]}>
          <ThemedText type="small" themeColor="textSecondary">
            Subtotal · Impuestos
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatPrice(order.subtotal)} · {formatPrice(order.tax)}
          </ThemedText>
        </View>
      </ThemedView>

      {order.cancellationReason && (
        <ThemedText type="small" themeColor="textSecondary">
          Motivo de cancelación: {order.cancellationReason}
        </ThemedText>
      )}

      {actionLabel && !isAllowed && (
        <ThemedText type="small" themeColor="textSecondary">
          Solo un administrador o gerente puede anular ventas completadas.
        </ThemedText>
      )}

      {actionLabel && isAllowed && !isConfirming && (
        <ActionButton label={actionLabel} variant="danger" onPress={() => setIsConfirming(true)} />
      )}

      {actionLabel && isAllowed && isConfirming && (
        <View style={styles.confirm}>
          <FormField label="Motivo (obligatorio)" value={reason} onChangeText={setReason} autoFocus />
          <FormError message={cancelOrder.error?.message ?? null} />
          <ActionButton
            label={`Confirmar: ${actionLabel.toLowerCase()}`}
            variant="danger"
            onPress={handleConfirm}
            isLoading={cancelOrder.isPending}
          />
          <ActionButton label="Volver" variant="secondary" onPress={() => setIsConfirming(false)} />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemName: {
    flex: 1,
  },
  totalRow: {
    marginTop: Spacing.one,
  },
  confirm: {
    gap: Spacing.two,
  },
});
