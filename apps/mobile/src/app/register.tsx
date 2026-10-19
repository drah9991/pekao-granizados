import { router } from 'expo-router';
import { useState } from 'react';

import { ActionButton } from '@/components/action-button';
import { CheckboxField } from '@/components/checkbox-field';
import { FormError } from '@/components/form-error';
import { FormField } from '@/components/form-field';
import { ScreenContainer } from '@/components/screen-container';
import { StateMessage } from '@/components/state-message';
import { ThemedText } from '@/components/themed-text';
import { signUpCustomer } from '@/features/auth/api/auth-actions';
import { validateRegistration } from '@/features/auth/validation';

const CONSENT_TEXT =
  'Autorizo a Pekao Granizados a tratar mis datos personales para gestionar mis pedidos, según la Ley 1581 de 2012.';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hasConsent, setHasConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async () => {
    const input = { name, email, phone, password, hasConsent };
    const validationError = validateRegistration(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUpCustomer(input);
      if (result.needsEmailConfirmation) {
        setNeedsConfirmation(true);
      } else {
        router.replace('/menu');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (needsConfirmation) {
    return (
      <StateMessage
        message={`Te enviamos un correo a ${email.trim()}. Confírmalo y luego inicia sesión.`}
        actionLabel="Ir a iniciar sesión"
        onAction={() => router.replace('/login')}
      />
    );
  }

  return (
    <ScreenContainer edges={['bottom']}>
      <ThemedText type="small" themeColor="textSecondary">
        Con tu cuenta guardas tus datos y, pronto, el historial de tus pedidos.
      </ThemedText>
      <FormField label="Nombre" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
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
        label="Teléfono (opcional)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <FormField
        label="Contraseña (mínimo 8 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <CheckboxField label={CONSENT_TEXT} isChecked={hasConsent} onToggle={() => setHasConsent((value) => !value)} />
      <FormError message={error} />
      <ActionButton label="Crear cuenta" onPress={handleSubmit} isLoading={isSubmitting} />
    </ScreenContainer>
  );
}
