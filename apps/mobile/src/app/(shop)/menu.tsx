import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useProducts } from '@/features/catalog/api/use-products';
import { ProductCard } from '@/features/catalog/components/product-card';
import type { Product } from '@/features/catalog/types';
import { useTheme } from '@/hooks/use-theme';

const GRID_COLUMNS = 2;

function renderProduct({ item }: { item: Product }) {
  return <ProductCard product={item} />;
}

function keyForProduct(product: Product): string {
  return product.id;
}

export default function CatalogScreen() {
  const theme = useTheme();
  const { data: products = [], isPending, isError, error, refetch, isRefetching } = useProducts();

  if (isPending) {
    return <StateMessage isLoading message="Cargando el menú…" />;
  }

  if (isError) {
    return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <FlatList
          data={products}
          keyExtractor={keyForProduct}
          renderItem={renderProduct}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">Pekao</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Granizados y bebidas congeladas
              </ThemedText>
            </ThemedView>
          }
          ListEmptyComponent={<StateMessage message="No hay granizados disponibles por ahora." />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                refetch();
              }}
              tintColor={theme.accent}
            />
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
    padding: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
});
