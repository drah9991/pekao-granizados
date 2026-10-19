import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface FormErrorProps {
  message: string | null;
}

const ERROR_COLOR = '#EF4444';

/** Mensaje de error anunciado por lectores de pantalla. */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <ThemedText type="small" style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      {message}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  error: {
    color: ERROR_COLOR,
  },
});
