import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { selectQuantityOf, useCartStore } from '@/features/cart/store/cart-store';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';

import { flavorFor } from '../flavors';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  /** Tipo de producto (granizado, sachet, dulce…) que se muestra como detalle. */
  typeBadge: { emoji: string; label: string };
}

const TOUCH_TARGET = 44;

export function ProductCard({ product, typeBadge }: ProductCardProps) {
  const theme = useTheme();
  const quantity = useCartStore(selectQuantityOf(product.id));
  const add = useCartStore((state) => state.add);
  const isInCart = quantity > 0;
  const flavor = flavorFor(product.name);
  const flavorColor = flavor?.color ?? theme.cardBorder;

  return (
    <View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder, borderTopColor: flavorColor }]}>
      <View>
        {product.imageUrl ? (
          <Image
            source={product.imageUrl}
            style={[styles.image, { backgroundColor: theme.backgroundSelected }]}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: `${flavorColor}33` }]}>
            <ThemedText style={styles.placeholderEmoji} accessibilityElementsHidden importantForAccessibility="no">
              {typeBadge.emoji}
            </ThemedText>
          </View>
        )}
        <View
          style={styles.typeTag}
          accessible
          accessibilityLabel={flavor ? `${typeBadge.label} de ${flavor.label}` : typeBadge.label}>
          {flavor && <View style={[styles.flavorDot, { backgroundColor: flavor.color }]} />}
          <ThemedText style={styles.typeText}>
            {typeBadge.emoji} {typeBadge.label}
          </ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <ThemedText numberOfLines={2} style={styles.name}>
          {product.name}
        </ThemedText>
        <ThemedText style={[styles.price, { color: theme.accent }]}>{formatPrice(product.price)}</ThemedText>
        <Pressable
          onPress={() => add(product)}
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${product.name} al carrito`}
          accessibilityValue={isInCart ? { text: `${quantity} en el carrito` } : undefined}
          style={({ pressed }) => [styles.addButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
          <ThemedText style={[styles.addLabel, { color: theme.onAccent }]}>
            {isInCart ? `Agregar · ${quantity}` : 'Agregar'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderTopWidth: 4,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  typeTag: {
    position: 'absolute',
    left: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  flavorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  name: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: 700,
    minHeight: 42,
  },
  price: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: 800,
  },
  addButton: {
    marginTop: Spacing.two,
    minHeight: TOUCH_TARGET,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.85,
  },
});
