import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAdminScope } from '@/features/admin/api/use-admin-scope';
import { useDailySummary } from '@/features/admin/api/use-orders';
import { useStoreInfo } from '@/features/admin/api/use-store-info';
import { KpiTile } from '@/features/admin/components/kpi-tile';
import { ModuleCard } from '@/features/admin/components/module-card';
import { signOut } from '@/features/auth/api/auth-actions';
import { ROLE_LABELS } from '@/features/auth/types';
import { formatPrice } from '@/lib/format';

const MODULES = [
  { title: 'Pedidos', description: 'Pendientes, ventas del día y anulaciones', href: '/admin/orders' },
  { title: 'Menú y precios', description: 'Visibilidad en la app, disponibilidad y precios', href: '/admin/products' },
  { title: 'Sede', description: 'Nombre, dirección y datos de la sede', href: '/admin/store' },
  { title: 'Equipo', description: 'Personal asignado y sus roles', href: '/admin/team' },
] as const;

export default function AdminHomeScreen() {
  const { access, storeId } = useAdminScope();
  const summary = useDailySummary(storeId);
  const store = useStoreInfo(storeId);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const roleLabel = access?.isSuperadmin
    ? 'Superadmin'
    : access?.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'Personal';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (failure) {
      setSignOutError(failure instanceof Error ? failure.message : 'No se pudo cerrar sesión.');
    }
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Hola, {access?.name ?? 'equipo'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {roleLabel} · {store.data?.name ?? 'Sede'}
        </ThemedText>
      </View>

      <ThemedText type="smallBold">Hoy</ThemedText>
      {summary.isError ? (
        <FormError message={summary.error.message} />
      ) : (
        <View style={styles.grid}>
          <KpiTile label="Ventas completadas" value={summary.data ? formatPrice(summary.data.completedTotal) : '…'} isHighlighted />
          <KpiTile label="Pedidos" value={summary.data ? String(summary.data.orderCount) : '…'} />
          <KpiTile label="Pendientes" value={summary.data ? String(summary.data.pendingCount) : '…'} />
          <KpiTile label="Cancelados" value={summary.data ? String(summary.data.cancelledCount) : '…'} />
        </View>
      )}

      <ThemedText type="smallBold">Módulos</ThemedText>
      <View style={styles.grid}>
        {MODULES.map((module) => (
          <ModuleCard
            key={module.href}
            title={module.title}
            description={module.description}
            onPress={() => router.push(module.href)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <ActionButton label="Ver la tienda como cliente" variant="secondary" onPress={() => router.push('/menu')} />
        <ActionButton label="Cerrar sesión" variant="secondary" onPress={handleSignOut} />
        <FormError message={signOutError} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.half,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footer: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
});
