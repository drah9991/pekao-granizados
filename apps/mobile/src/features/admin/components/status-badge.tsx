import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { ORDER_STATUS_LABELS, type OrderStatus } from '../types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#D97706',
  processing: '#2563EB',
  completed: '#059669',
  cancelled: '#DC2626',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const color = STATUS_COLORS[status] ?? '#6B7280';

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <ThemedText type="smallBold" style={[styles.text, { color }]}>
        {ORDER_STATUS_LABELS[status] ?? status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
});
