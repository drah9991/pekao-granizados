import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useProductTypes } from '@/features/catalog/api/use-product-types';
import { useProducts } from '@/features/catalog/api/use-products';
import { CatalogToolbar } from '@/features/catalog/components/catalog-toolbar';
import { ProductCard } from '@/features/catalog/components/product-card';
import { availableTypes, filterProducts, typeBadgeFor } from '@/features/catalog/product-filters';
import { useTheme } from '@/hooks/use-theme';

// Celular: 2 columnas grandes y legibles. Pantallas anchas: como máximo 4.
const MAX_CATALOG_WIDTH = 1100;
const MIN_CARD_WIDTH = 240;
const MIN_COLUMNS = 2;
const MAX_COLUMNS = 4;

function columnsFor(screenWidth: number): number {
  const usable = Math.min(screenWidth, MAX_CATALOG_WIDTH) - Spacing.two * 2;
  const columns = Math.floor(usable / MIN_CARD_WIDTH);
  return Math.max(MIN_COLUMNS, Math.min(MAX_COLUMNS, columns));
}

export default function CatalogScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { data: products = [], isPending, isError, error, refetch, isRefetching } = useProducts();
  const { data: configuredTypes = [] } = useProductTypes();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  if (isPending) {
    return <StateMessage isLoading message="Cargando el menú…" />;
  }

  if (isError) {
    return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;
  }

  const columns = columnsFor(width);
  const types = availableTypes(products, configuredTypes);
  const visible = filterProducts(products, { query, type: selectedType });
  const itemWidth = { width: `${100 / columns}%` } as const;
  const hasFilters = query.trim().length > 0 || selectedType !== 'all';

  const clearFilters = () => {
    setQuery('');
    setSelectedType('all');
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" style={styles.title}>
              Pekao
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Granizados y bebidas congeladas
            </ThemedText>
          </View>
          <CatalogToolbar
            query={query}
            onQueryChange={setQuery}
            types={types}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            totalCount={products.length}
          />
        </View>

        <FlatList
          key={columns}
          data={visible}
          keyExtractor={(product) => product.id}
          numColumns={columns}
          renderItem={({ item }) => (
            <View style={itemWidth}>
              <ProductCard product={item} typeBadge={typeBadgeFor(item.type, configuredTypes)} />
            </View>
          )}
          style={styles.list}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            hasFilters ? (
              <StateMessage
                message={query.trim() ? `No encontramos productos para «${query.trim()}».` : 'No hay productos en esta categoría.'}
                actionLabel="Ver todo el menú"
                onAction={clearFilters}
              />
            ) : (
              <StateMessage message="No hay granizados disponibles por ahora." />
            )
          }
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
  header: {
    width: '100%',
    maxWidth: MAX_CATALOG_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  list: {
    width: '100%',
    maxWidth: MAX_CATALOG_WIDTH,
    alignSelf: 'center',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
