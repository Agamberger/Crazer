import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { colors, typography } from '@/shared/constants/theme';

export type AppTextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label';
export type AppTextColor =
  'primary' | 'secondary' | 'muted' | 'accent' | 'success' | 'warning' | 'error';
export type AppTextWeight = keyof typeof typography.fontWeights;

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  color?: AppTextColor;
  weight?: AppTextWeight;
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

const COLOR_MAP: Record<AppTextColor, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
};

/** Texte typographié selon le thème Crazer. À utiliser à la place de `Text`. */
export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align,
  style,
  children,
  ...props
}) => (
  <Text
    style={[
      VARIANT_STYLES[variant],
      { color: COLOR_MAP[color] },
      weight ? { fontWeight: typography.fontWeights[weight] } : null,
      align ? { textAlign: align } : null,
      style,
    ]}
    accessibilityRole={variant.startsWith('h') ? 'header' : undefined}
    {...props}
  >
    {children}
  </Text>
);

const styles = StyleSheet.create({
  body: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.regular,
  },
  bodySmall: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.regular,
  },
  caption: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.regular,
  },
  h1: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
  },
  h2: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  h3: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
  },
  label: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
});

const VARIANT_STYLES: Record<AppTextVariant, TextStyle> = {
  body: styles.body,
  bodySmall: styles.bodySmall,
  caption: styles.caption,
  h1: styles.h1,
  h2: styles.h2,
  h3: styles.h3,
  label: styles.label,
};
