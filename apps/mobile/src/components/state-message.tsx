import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface StateMessageProps {
  message: string;
  isLoading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado de pantalla completa para carga, error o lista vacía. */
export function StateMessage({ message, isLoading = false, actionLabel, onAction }: StateMessageProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container} accessibilityLiveRegion="polite">
      {isLoading && <ActivityIndicator size="large" color={theme.accent} />}
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {message}
      </ThemedText>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={12}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="smallBold" style={{ color: theme.accent }}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
