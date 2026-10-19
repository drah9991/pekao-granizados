import { Redirect, Stack } from 'expo-router';

import { StateMessage } from '@/components/state-message';
import { useAccess } from '@/features/auth/api/use-access';
import { useSessionStore } from '@/features/auth/session-store';
import { useTheme } from '@/hooks/use-theme';

/** Solo personal. La autorización real la hace RLS; esto evita pantallas sin datos. */
export default function AdminLayout() {
  const theme = useTheme();
  const isReady = useSessionStore((state) => state.isReady);
  const hasSession = useSessionStore((state) => state.session !== null);
  const { data: access, isPending, isError, error, refetch } = useAccess();

  if (!isReady || (hasSession && isPending)) return <StateMessage isLoading message="Verificando acceso…" />;
  if (!hasSession) return <Redirect href="/login" />;
  if (isError) return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;
  if (access?.kind !== 'staff') return <Redirect href="/menu" />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.accent,
        headerStyle: { backgroundColor: theme.background },
        headerTitleStyle: { color: theme.text },
      }}>
      <Stack.Screen name="index" options={{ title: 'Panel' }} />
      <Stack.Screen name="orders/index" options={{ title: 'Pedidos' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Detalle del pedido' }} />
      <Stack.Screen name="products" options={{ title: 'Menú y precios' }} />
      <Stack.Screen name="store" options={{ title: 'Sede' }} />
      <Stack.Screen name="team" options={{ title: 'Equipo' }} />
    </Stack>
  );
}
