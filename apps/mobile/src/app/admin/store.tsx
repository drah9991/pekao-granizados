import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { FormField } from '@/components/form-field';
import { ScreenContainer } from '@/components/screen-container';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAdminScope } from '@/features/admin/api/use-admin-scope';
import { useStoreInfo, useUpdateStore } from '@/features/admin/api/use-store-info';
import type { StoreInfo } from '@/features/admin/types';
import { canEditStore } from '@/features/auth/types';

export default function AdminStoreScreen() {
  const { access, storeId } = useAdminScope();
  const { data: store, isPending, isError, error, refetch } = useStoreInfo(storeId);

  if (isPending) return <StateMessage isLoading message="Cargando sede…" />;
  if (isError) return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;

  return <StoreForm store={store} canEdit={access ? canEditStore(access) : false} />;
}

function StoreForm({ store, canEdit }: { store: StoreInfo; canEdit: boolean }) {
  const updateStore = useUpdateStore(store.id);
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address ?? '');
  const hasChanges = name !== store.name || address !== (store.address ?? '');

  return (
    <ScreenContainer edges={['bottom']}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Moneda: {store.currency ?? 'COP'} · Impuesto: {store.taxRate ?? 0}%
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          ID: {store.id}
        </ThemedText>
      </ThemedView>

      <FormField label="Nombre de la sede" value={name} onChangeText={setName} editable={canEdit} />
      <FormField label="Dirección" value={address} onChangeText={setAddress} editable={canEdit} />

      {canEdit ? (
        <View style={styles.actions}>
          <FormError message={updateStore.error?.message ?? null} />
          {updateStore.isSuccess && !hasChanges && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              Cambios guardados.
            </ThemedText>
          )}
          <ActionButton
            label="Guardar cambios"
            onPress={() => updateStore.mutate({ name, address })}
            isLoading={updateStore.isPending}
            isDisabled={!hasChanges}
          />
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Solo un administrador puede editar los datos de la sede.
        </ThemedText>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
});
