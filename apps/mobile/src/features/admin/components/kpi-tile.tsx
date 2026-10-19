import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface KpiTileProps {
  label: string;
  value: string;
  isHighlighted?: boolean;
}

export function KpiTile({ label, value, isHighlighted = false }: KpiTileProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={[styles.value, isHighlighted && { color: theme.accent }]}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
  value: {
    fontSize: 22,
    lineHeight: 30,
  },
});
