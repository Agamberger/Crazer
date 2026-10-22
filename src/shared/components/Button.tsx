import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  StyleProp,
  TextStyle,
} from 'react-native';
import { colors, spacing, typography } from '../constants/theme';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceLight;
    if (variant === 'primary') return colors.primary;
    if (variant === 'secondary') return colors.secondary;
    return 'transparent';
  };

  const buttonSizeStyle =
    size === 'sm' ? styles.buttonSm : size === 'lg' ? styles.buttonLg : styles.buttonMd;
  const textSizeStyle =
    size === 'sm' ? styles.textSm : size === 'lg' ? styles.textLg : styles.textMd;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonSizeStyle,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineBorder,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} size={size === 'sm' ? 'small' : 'small'} />
      ) : (
        <Text
          style={[
            styles.text,
            textSizeStyle,
            variant === 'outline' && styles.outlineText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
  },
  buttonLg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  buttonMd: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonSm: {
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  outlineBorder: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  outlineText: {
    color: colors.primary,
  },
  text: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  textLg: {
    fontSize: typography.fontSizes.lg,
  },
  textMd: {
    fontSize: typography.fontSizes.md,
  },
  textSm: {
    fontSize: typography.fontSizes.sm,
  },
});
