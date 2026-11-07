import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';

export interface DividerProps {
  /** Texte centré optionnel (ex : « ou »). */
  label?: string;
  /** Espacement vertical (clé de `spacing`). */
  spacingSize?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
}

export const Divider: React.FC<DividerProps> = ({ label, spacingSize = 'md', style }) => {
  const margin = { marginVertical: spacing[spacingSize] };

  if (!label) {
    return <View style={[styles.line, margin, style]} accessibilityRole="none" testID="divider" />;
  }

  return (
    <View style={[styles.row, margin, style]} testID="divider">
      <View style={[styles.line, styles.flex]} />
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.line, styles.flex]} />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginHorizontal: spacing.sm,
  },
  line: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
