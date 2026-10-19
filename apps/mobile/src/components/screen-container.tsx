import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

interface ScreenContainerProps {
  children: ReactNode;
  /** Bordes con área segura; los layouts con encabezado no necesitan 'top'. */
  edges?: ('top' | 'bottom')[];
}

/** Contenedor desplazable para formularios y pantallas de contenido. */
export function ScreenContainer({ children, edges = ['top', 'bottom'] }: ScreenContainerProps) {
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView edges={edges} style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
