import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';

import { useUpdateProduct, validatePrice } from '../api/use-admin-products';
import type { AdminProduct, ProductPatch } from '../types';

interface ProductAdminRowProps {
  product: AdminProduct;
  storeId: string;
  canEdit: boolean;
}

export function ProductAdminRow({ product, storeId, canEdit }: ProductAdminRowProps) {
  const theme = useTheme();
  const updateProduct = useUpdateProduct(storeId);
  const [priceDraft, setPriceDraft] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const save = (patch: ProductPatch) => updateProduct.mutate({ productId: product.id, patch });

  const handleSavePrice = () => {
    const result = validatePrice(priceDraft ?? '');
    if (typeof result === 'string') {
      setPriceError(result);
      return;
    }
    setPriceError(null);
    updateProduct.mutate(
      { productId: product.id, patch: { price: result } },
      { onSuccess: () => setPriceDraft(null) },
    );
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <ThemedText type="smallBold">{product.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[product.category, product.type].filter(Boolean).join(' · ') || 'Sin categoría'}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ color: theme.accent }}>
          {formatPrice(product.price)}
        </ThemedText>
      </View>

      <View style={styles.switchRow}>
        <ThemedText type="small">Visible en la app</ThemedText>
        <Switch
          value={product.isPublic}
          onValueChange={(value) => save({ is_public: value })}
          disabled={!canEdit || updateProduct.isPending}
          accessibilityLabel={`Visible en la app: ${product.name}`}
        />
      </View>
      <View style={styles.switchRow}>
        <ThemedText type="small">Disponible (activo)</ThemedText>
        <Switch
          value={product.isActive}
          onValueChange={(value) => save({ active: value })}
          disabled={!canEdit || updateProduct.isPending}
          accessibilityLabel={`Disponible: ${product.name}`}
        />
      </View>

      {canEdit && priceDraft === null && (
        <ActionButton label="Cambiar precio" variant="secondary" onPress={() => setPriceDraft(String(product.price))} />
      )}
      {canEdit && priceDraft !== null && (
        <View style={styles.priceRow}>
          <TextInput
            value={priceDraft}
            onChangeText={setPriceDraft}
            keyboardType="number-pad"
            accessibilityLabel={`Nuevo precio de ${product.name}`}
            style={[styles.priceInput, { color: theme.text, borderColor: theme.backgroundSelected }]}
          />
          <ActionButton label="Guardar" onPress={handleSavePrice} isLoading={updateProduct.isPending} />
          <ActionButton label="Cancelar" variant="secondary" onPress={() => setPriceDraft(null)} />
        </View>
      )}
      <FormError message={priceError ?? updateProduct.error?.message ?? null} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  priceInput: {
    flexGrow: 1,
    minWidth: 100,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
  },
});
