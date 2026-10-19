import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { ScreenContainer } from '@/components/screen-container';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAccess } from '@/features/auth/api/use-access';
import { useSessionStore } from '@/features/auth/session-store';

/** Puerta de entrada: el personal va al panel, los clientes al menú. */
export default function WelcomeScreen() {
  const isReady = useSessionStore((state) => state.isReady);
  const hasSession = useSessionStore((state) => state.session !== null);
  const { data: access, isPending, isError, error, refetch } = useAccess();

  if (!isReady || (hasSession && isPending)) {
    return <StateMessage isLoading message="Cargando…" />;
  }

  if (hasSession && isError) {
    return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;
  }

  if (access?.kind === 'staff') return <Redirect href="/admin" />;
  if (access?.kind === 'customer') return <Redirect href="/menu" />;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <ThemedText type="title">Pekao</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Granizados y bebidas congeladas. Pide desde tu celular y recoge en la sede.
        </ThemedText>
      </View>
      <View style={styles.actions}>
        <ActionButton label="Iniciar sesión" onPress={() => router.push('/login')} />
        <ActionButton label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
        <ActionButton
          label="Continuar sin cuenta"
          variant="secondary"
          onPress={() => router.replace('/menu')}
          accessibilityHint="Puedes ver el menú y pedir sin registrarte"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  actions: {
    gap: Spacing.two,
  },
});
