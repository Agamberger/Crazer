import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/shared/constants/theme';

export type BadgeTone = 'primary' | 'neutral' | 'success' | 'warning' | 'error';

export interface BadgeProps {
  /** Texte ou nombre affiché. Les nombres > `max` deviennent `max+`. */
  label: string | number;
  tone?: BadgeTone;
  max?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  neutral: { bg: colors.surfaceLight, fg: colors.textSecondary },
  success: { bg: colors.success, fg: colors.white },
  warning: { bg: colors.warning, fg: colors.black },
  error: { bg: colors.error, fg: colors.white },
};

/** Petite étiquette de statut ou compteur de notifications. */
export const Badge: React.FC<BadgeProps> = ({
  label,
  tone = 'primary',
  max = 99,
  style,
  testID,
}) => {
  const text = typeof label === 'number' && label > max ? `${max}+` : String(label);
  const { bg, fg } = TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]} testID={testID}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    justifyContent: 'center',
    minWidth: 20,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 2,
  },
  text: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
});
