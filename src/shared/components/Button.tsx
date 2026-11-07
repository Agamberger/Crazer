import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { colors, iconSizes, opacity, radii, spacing, typography } from '@/shared/constants/theme';
import { ComponentSize, IconName } from './types';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ComponentSize;
  loading?: boolean;
  /** Icône Ionicons affichée avant le texte. */
  leftIcon?: IconName;
  /** Icône Ionicons affichée après le texte. */
  rightIcon?: IconName;
  /** Le bouton occupe toute la largeur disponible. */
  fullWidth?: boolean;
  textStyle?: StyleProp<TextStyle>;
}

const BACKGROUND: Record<ButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  outline: colors.transparent,
  ghost: colors.transparent,
  danger: colors.error,
};

const FOREGROUND: Record<ButtonVariant, string> = {
  primary: colors.textPrimary,
  secondary: colors.textPrimary,
  outline: colors.primary,
  ghost: colors.primary,
  danger: colors.textPrimary,
};

const ICON_SIZE: Record<ComponentSize, number> = {
  sm: iconSizes.sm,
  md: iconSizes.md,
  lg: iconSizes.lg,
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  disabled,
  accessibilityLabel,
  ...props
}) => {
  const isDisabled = Boolean(disabled || loading);
  const backgroundColor = disabled ? colors.surfaceLight : BACKGROUND[variant];
  const foreground = disabled ? colors.textMuted : FOREGROUND[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        SIZE_STYLES[size].button,
        { backgroundColor },
        variant === 'outline' && styles.outlineBorder,
        variant === 'outline' && disabled && styles.outlineDisabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" testID="button-loader" />
      ) : (
        <View style={styles.content}>
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={ICON_SIZE[size]}
              color={foreground}
              style={styles.leftIcon}
            />
          ) : null}
          <Text style={[styles.text, SIZE_STYLES[size].text, { color: foreground }, textStyle]}>
            {title}
          </Text>
          {rightIcon ? (
            <Ionicons
              name={rightIcon}
              size={ICON_SIZE[size]}
              color={foreground}
              style={styles.rightIcon}
            />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  lg: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  md: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  outlineBorder: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  outlineDisabled: {
    borderColor: colors.border,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  sm: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    fontWeight: typography.fontWeights.semibold,
  },
});

const textSizeStyles = StyleSheet.create({
  lg: { fontSize: typography.fontSizes.lg },
  md: { fontSize: typography.fontSizes.md },
  sm: { fontSize: typography.fontSizes.sm },
});

const SIZE_STYLES: Record<ComponentSize, { button: ViewStyle; text: TextStyle }> = {
  sm: { button: styles.sm, text: textSizeStyles.sm },
  md: { button: styles.md, text: textSizeStyles.md },
  lg: { button: styles.lg, text: textSizeStyles.lg },
};
