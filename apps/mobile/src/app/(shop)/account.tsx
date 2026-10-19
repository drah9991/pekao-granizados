import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { ScreenContainer } from '@/components/screen-container';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { signOut } from '@/features/auth/api/auth-actions';
import { useAccess } from '@/features/auth/api/use-access';

export default function AccountScreen() {
  const { data: access, isPending, isError, error, refetch } = useAccess();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (failure) {
      setSignOutError(failure instanceof Error ? failure.message : 'No se pudo cerrar sesión.');
    }
  };

  if (isPending) return <StateMessage isLoading message="Cargando tu cuenta…" />;
  if (isError) return <StateMessage message={error.message} actionLabel="Reintentar" onAction={() => refetch()} />;

  if (!access) {
    return (
      <ScreenContainer edges={['top']}>
        <ThemedText type="subtitle">Tu cuenta</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Estás comprando sin cuenta. Crea una para guardar tus datos.
        </ThemedText>
        <ActionButton label="Iniciar sesión" onPress={() => router.push('/login')} />
        <ActionButton label="Crear cuenta" variant="secondary" onPress={() => router.push('/register')} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={['top']}>
      <ThemedText type="subtitle">Tu cuenta</ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">{access.name ?? 'Sin nombre'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {access.email}
        </ThemedText>
      </ThemedView>
      <View style={styles.actions}>
        {access.kind === 'staff' && (
          <ActionButton label="Ir al panel de administración" onPress={() => router.push('/admin')} />
        )}
        <ActionButton label="Cerrar sesión" variant="secondary" onPress={handleSignOut} />
        <FormError message={signOutError} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.two,
  },
});
