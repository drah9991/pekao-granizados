import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { FilterChips } from '@/components/filter-chips';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAdminScope } from '@/features/admin/api/use-admin-scope';
import { useOrders } from '@/features/admin/api/use-orders';
import { StatusBadge } from '@/features/admin/components/status-badge';
import type { OrderStatus, OrderSummary } from '@/features/admin/types';
import { formatDateTime, formatPrice } from '@/lib/format';

type StatusFilter = OrderStatus | 'all';

const FILTERS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'all', label: 'Todos' },
] as const satisfies readonly { value: StatusFilter; label: string }[];

function OrderRow({ order }: { order: OrderSummary }) {
  const label = `Pedido de ${order.customerName ?? 'cliente sin cuenta'}, ${formatPrice(order.total)}`;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/admin/orders/[id]', params: { id: order.id } })}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowInfo}>
          <ThemedText type="smallBold">{order.customerName ?? 'Cliente sin cuenta'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(order.createdAt)} · #{order.id.slice(0, 8)}
          </ThemedText>
          <StatusBadge status={order.status} />
        </View>
        <ThemedText type="smallBold">{formatPrice(order.total)}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const { storeId } = useAdminScope();
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const { data: orders = [], isPending, isError, error, refetch, isRefetching } = useOrders(storeId, filter);

  return (
    <ThemedView style={styles.screen}>
      <View style={styles.filters}>
        <FilterChips options={FILTERS} selected={filter} onSelect={setFilter} />
      </View>
      {isPending ? (
        <StateMessage isLoading message="Cargando pedidos…" />
      ) : isError ? (
        <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order) => order.id}
          renderItem={({ item }) => <OrderRow order={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<StateMessage message="No hay pedidos con este estado." />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
            />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  filters: {
    padding: Spacing.three,
    paddingBottom: Spacing.one,
  },
  list: {
    flexGrow: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.8,
  },
});
