import { FlatList, StyleSheet } from 'react-native';

import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAdminScope } from '@/features/admin/api/use-admin-scope';
import { useTeam } from '@/features/admin/api/use-store-info';
import { ROLE_LABELS, type StaffRole } from '@/features/auth/types';

function roleNames(roles: string[]): string {
  if (roles.length === 0) return 'Rol no visible';
  return roles.map((role) => ROLE_LABELS[role as StaffRole] ?? role).join(', ');
}

export default function AdminTeamScreen() {
  const { storeId } = useAdminScope();
  const { data: team = [], isPending, isError, error, refetch } = useTeam(storeId);

  if (isPending) return <StateMessage isLoading message="Cargando equipo…" />;
  if (isError) return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={team}
        keyExtractor={(member) => member.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary">
            Las cuentas y roles del personal se administran desde el POS.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <ThemedView type="backgroundElement" style={styles.row}>
            <ThemedText type="smallBold">{item.name ?? 'Sin nombre'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {roleNames(item.roles)}
              {item.phone ? ` · ${item.phone}` : ''}
            </ThemedText>
          </ThemedView>
        )}
        ListEmptyComponent={<StateMessage message="No hay personal visible para esta sede." />}
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
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
});
