import { Image } from 'expo-image';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { selectQuantityOf, useCartStore } from '@/features/cart/store/cart-store';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';

import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const theme = useTheme();
  const quantity = useCartStore(selectQuantityOf(product.id));
  const add = useCartStore((state) => state.add);
  const isInCart = quantity > 0;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Image
        source={product.imageUrl}
        style={[styles.image, { backgroundColor: theme.backgroundSelected }]}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />
      <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
        {product.name}
      </ThemedText>
      <ThemedText type="smallBold" style={{ color: theme.accent }}>
        {formatPrice(product.price)}
      </ThemedText>
      <Pressable
        onPress={() => add(product)}
        accessibilityRole="button"
        accessibilityLabel={`Agregar ${product.name} al carrito`}
        accessibilityValue={isInCart ? { text: `${quantity} en el carrito` } : undefined}
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
          {isInCart ? `Agregar otro · ${quantity}` : 'Agregar'}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Spacing.two,
  },
  name: {
    marginTop: Spacing.one,
    minHeight: 40,
  },
  button: {
    marginTop: Spacing.two,
    minHeight: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
