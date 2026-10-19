import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  isLoading?: boolean;
  isDisabled?: boolean;
  accessibilityHint?: string;
}

const DANGER_COLOR = '#DC2626';

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  isDisabled = false,
  accessibilityHint,
}: ActionButtonProps) {
  const theme = useTheme();
  const isInactive = isDisabled || isLoading;
  const background =
    variant === 'primary' ? theme.accent : variant === 'danger' ? DANGER_COLOR : theme.backgroundElement;
  const foreground = variant === 'secondary' ? theme.text : variant === 'danger' ? '#ffffff' : theme.onAccent;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isInactive, busy: isLoading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        isInactive && styles.inactive,
        pressed && styles.pressed,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <ThemedText type="smallBold" style={{ color: foreground }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
