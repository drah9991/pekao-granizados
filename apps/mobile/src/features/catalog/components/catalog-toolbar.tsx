import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FilterChips } from '@/components/filter-chips';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { ProductTypeInfo } from '../product-filters';

interface CatalogToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  types: (ProductTypeInfo & { count: number })[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  totalCount: number;
}

export function CatalogToolbar({
  query,
  onQueryChange,
  types,
  selectedType,
  onTypeChange,
  totalCount,
}: CatalogToolbarProps) {
  const theme = useTheme();
  const options = [
    { value: 'all', label: `Todos · ${totalCount}` },
    ...types.map((type) => ({ value: type.code, label: `${type.emoji} ${type.label} · ${type.count}` })),
  ];

  return (
    <View style={styles.toolbar}>
      <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
        <ThemedText type="small" themeColor="textSecondary" accessibilityElementsHidden importantForAccessibility="no">
          🔍
        </ThemedText>
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar granizado, sabor…"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="Buscar en el menú"
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: theme.text }]}
        />
        {query.length > 0 && (
          <Pressable onPress={() => onQueryChange('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={12}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              ✕
            </ThemedText>
          </Pressable>
        )}
      </View>
      {types.length > 1 && <FilterChips options={options} selected={selectedType} onSelect={onTypeChange} />}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    gap: Spacing.two,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 15,
  },
});
