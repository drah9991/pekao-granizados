import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';

import { useCartStore, type CartLine } from '../store/cart-store';

interface CartLineRowProps {
  line: CartLine;
}

export function CartLineRow({ line }: CartLineRowProps) {
  const theme = useTheme();
  const changeQuantity = useCartStore((state) => state.changeQuantity);

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {line.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatPrice(line.unitPrice * line.quantity)}
        </ThemedText>
      </View>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => changeQuantity(line.lineId, -1)}
          accessibilityRole="button"
          accessibilityLabel={line.quantity === 1 ? `Quitar ${line.name}` : `Quitar uno de ${line.name}`}
          style={({ pressed }) => [styles.stepButton, { borderColor: theme.accent }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            −
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.quantity} accessibilityLabel={`${line.quantity} unidades`}>
          {line.quantity}
        </ThemedText>
        <Pressable
          onPress={() => changeQuantity(line.lineId, 1)}
          accessibilityRole="button"
          accessibilityLabel={`Agregar uno de ${line.name}`}
          style={({ pressed }) => [styles.stepButton, { borderColor: theme.accent }, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            +
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
