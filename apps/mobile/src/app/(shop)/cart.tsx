import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { CartLineRow } from '@/features/cart/components/cart-line-row';
import { selectLines, selectSubtotal, useCartStore, type CartLine } from '@/features/cart/store/cart-store';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';

function renderLine({ item }: { item: CartLine }) {
  return <CartLineRow line={item} />;
}

function keyForLine(line: CartLine): string {
  return line.lineId;
}

export default function CartScreen() {
  const theme = useTheme();
  const lines = useCartStore(selectLines);
  const subtotal = useCartStore(selectSubtotal);
  const clear = useCartStore((state) => state.clear);

  if (lines.length === 0) {
    return <StateMessage message="Tu carrito está vacío. Agrega un granizado desde el menú." />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <FlatList
          data={lines}
          keyExtractor={keyForLine}
          renderItem={renderLine}
          contentContainerStyle={styles.content}
          ListHeaderComponent={<ThemedText type="subtitle">Tu pedido</ThemedText>}
          ListFooterComponent={
            <ThemedView type="backgroundElement" style={styles.summary}>
              <ThemedView type="backgroundElement" style={styles.totalRow}>
                <ThemedText type="default">Subtotal</ThemedText>
                <ThemedText type="smallBold" style={[styles.total, { color: theme.accent }]}>
                  {formatPrice(subtotal)}
                </ThemedText>
              </ThemedView>
              <ThemedText type="small" themeColor="textSecondary">
                El total final se confirma al crear el pedido.
              </ThemedText>
              <ActionButton label="Continuar al pedido" onPress={() => router.push('/checkout')} />
              <Pressable
                onPress={clear}
                accessibilityRole="button"
                accessibilityLabel="Vaciar carrito"
                hitSlop={12}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Vaciar carrito
                </ThemedText>
              </Pressable>
            </ThemedView>
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: Spacing.two,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  summary: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontSize: 20,
    lineHeight: 28,
  },
  clearButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
