import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { FormError } from '@/components/form-error';
import { FormField } from '@/components/form-field';
import { ScreenContainer } from '@/components/screen-container';
import { ThemedText } from '@/components/themed-text';
import { signIn } from '@/features/auth/api/auth-actions';
import { validateLogin } from '@/features/auth/validation';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateLogin({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
      // La puerta de entrada decide si va al panel o al menú.
      router.replace('/');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        Clientes y personal de Pekao usan la misma entrada.
      </ThemedText>
      <FormField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FormField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={handleSubmit}
      />
      <FormError message={error} />
      <ActionButton label="Entrar" onPress={handleSubmit} isLoading={isSubmitting} />
      <Pressable onPress={() => router.replace('/register')} accessibilityRole="link" hitSlop={12}>
        <ThemedText type="small" style={{ color: theme.accent }}>
          ¿No tienes cuenta? Crea una
        </ThemedText>
      </Pressable>
    </ScreenContainer>
  );
}
