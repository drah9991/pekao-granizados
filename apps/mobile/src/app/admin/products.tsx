import { FlatList, StyleSheet } from 'react-native';

import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAdminProducts } from '@/features/admin/api/use-admin-products';
import { useAdminScope } from '@/features/admin/api/use-admin-scope';
import { ProductAdminRow } from '@/features/admin/components/product-admin-row';
import { canManageMenu } from '@/features/auth/types';

export default function AdminProductsScreen() {
  const { access, storeId } = useAdminScope();
  const { data: products = [], isPending, isError, error, refetch } = useAdminProducts(storeId);
  const canEdit = access ? canManageMenu(access) : false;

  if (isPending) return <StateMessage isLoading message="Cargando productos…" />;
  if (isError) return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={products}
        keyExtractor={(product) => product.id}
        renderItem={({ item }) => <ProductAdminRow product={item} storeId={storeId} canEdit={canEdit} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          canEdit ? undefined : (
            <ThemedText type="small" themeColor="textSecondary">
              Solo administradores y gerentes pueden editar el menú.
            </ThemedText>
          )
        }
        ListEmptyComponent={<StateMessage message="Esta sede no tiene productos." />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
});
