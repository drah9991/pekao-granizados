import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CheckboxFieldProps {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
}

export function CheckboxField({ label, isChecked, onToggle }: CheckboxFieldProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked }}
      accessibilityLabel={label}
      style={styles.row}>
      <View
        style={[
          styles.box,
          { borderColor: theme.accent, backgroundColor: isChecked ? theme.accent : 'transparent' },
        ]}>
        {isChecked && (
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            ✓
          </ThemedText>
        )}
      </View>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
