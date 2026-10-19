import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { ScreenContainer } from '@/components/screen-container';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAccess } from '@/features/auth/api/use-access';
import { selectLines, selectSubtotal, useCartStore } from '@/features/cart/store/cart-store';
import { useCreateOrder, type CreatedOrder } from '@/features/checkout/api/use-create-order';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';

export default function CheckoutScreen() {
  const theme = useTheme();
  const lines = useCartStore(selectLines);
  const subtotal = useCartStore(selectSubtotal);
  const clearCart = useCartStore((state) => state.clear);
  const { data: access } = useAccess();
  const createOrder = useCreateOrder();
  // Una clave por intento de compra: si la red falla y se reintenta, no se duplica el pedido.
  const [idempotencyKey] = useState(() => Crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<{ order: CreatedOrder; estimatedTotal: number } | null>(null);

  if (confirmation) {
    return <OrderConfirmed order={confirmation.order} estimatedTotal={confirmation.estimatedTotal} />;
  }

  if (lines.length === 0) {
    return (
      <StateMessage
        message="Tu carrito está vacío."
        actionLabel="Ver el menú"
        onAction={() => router.replace('/menu')}
      />
    );
  }

  const handleConfirm = () => {
    createOrder.mutate(
      { lines, idempotencyKey },
      {
        onSuccess: (order) => {
          setConfirmation({ order, estimatedTotal: subtotal });
          clearCart();
        },
      },
    );
  };

  const isCustomer = access?.kind === 'customer';

  return (
    <ScreenContainer edges={['bottom']}>
      <ThemedView type="backgroundElement" style={styles.card}>
        {lines.map((line) => (
          <View key={line.lineId} style={styles.row}>
            <ThemedText type="small" style={styles.flex}>
              {line.quantity} × {line.name}
            </ThemedText>
            <ThemedText type="small">{formatPrice(line.unitPrice * line.quantity)}</ThemedText>
          </View>
        ))}
        <View style={[styles.row, styles.totalRow]}>
          <ThemedText type="smallBold">Total estimado</ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            {formatPrice(subtotal)}
          </ThemedText>
        </View>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Recoger en la sede</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Pagas al recoger. El total final lo confirma la sede con los precios vigentes.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {isCustomer
            ? `El pedido queda a nombre de ${access?.name ?? 'tu cuenta'}.`
            : 'Estás pidiendo sin cuenta. Guarda el número de pedido que verás al confirmar.'}
        </ThemedText>
      </ThemedView>

      <FormError message={createOrder.error?.message ?? null} />
      <ActionButton label="Confirmar pedido" onPress={handleConfirm} isLoading={createOrder.isPending} />
      <ActionButton label="Seguir comprando" variant="secondary" onPress={() => router.back()} />
    </ScreenContainer>
  );
}

function OrderConfirmed({ order, estimatedTotal }: { order: CreatedOrder; estimatedTotal: number }) {
  const theme = useTheme();
  const hasPriceChange = estimatedTotal !== order.total;

  return (
    <ScreenContainer edges={['bottom']}>
      <View style={styles.success} accessibilityLiveRegion="polite">
        <ThemedText type="subtitle">¡Pedido recibido!</ThemedText>
        <ThemedText type="default">
          Pedido <ThemedText type="smallBold">#{order.orderId.slice(0, 8).toUpperCase()}</ThemedText>
        </ThemedText>
        <ThemedText type="smallBold" style={[styles.total, { color: theme.accent }]}>
          {formatPrice(order.total)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Muestra este número en la sede para pagar y recoger tu pedido.
        </ThemedText>
        {hasPriceChange && (
          <ThemedText type="small" themeColor="textSecondary">
            El total cambió porque la sede actualizó algún precio.
          </ThemedText>
        )}
      </View>
      <ActionButton label="Volver al menú" onPress={() => router.replace('/menu')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  totalRow: {
    marginTop: Spacing.one,
  },
  success: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  total: {
    fontSize: 28,
    lineHeight: 36,
  },
});
