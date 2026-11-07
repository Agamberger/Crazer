import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { colors, iconSizes, opacity, radii } from '@/shared/constants/theme';
import { ComponentSize, IconName } from './types';

export type IconButtonVariant = 'filled' | 'surface' | 'ghost';

export interface IconButtonProps extends Omit<TouchableOpacityProps, 'accessibilityLabel'> {
  icon: IconName;
  /** Obligatoire : un bouton icône n'a pas de texte visible. */
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: ComponentSize;
  color?: string;
}

const DIMENSIONS: Record<ComponentSize, { box: number; icon: number }> = {
  sm: { box: 32, icon: iconSizes.sm },
  md: { box: 40, icon: iconSizes.md },
  lg: { box: 52, icon: iconSizes.lg },
};

const BACKGROUND: Record<IconButtonVariant, string> = {
  filled: colors.primary,
  surface: colors.surfaceLight,
  ghost: colors.transparent,
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'surface',
  size = 'md',
  color,
  disabled,
  style,
  ...props
}) => {
  const { box, icon: iconSize } = DIMENSIONS[size];
  const iconColor = color ?? (variant === 'filled' ? colors.textPrimary : colors.textSecondary);

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: BACKGROUND[variant], height: box, width: box },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      activeOpacity={opacity.pressed}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={8}
      {...props}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.full,
    justifyContent: 'center',
  },
  disabled: {
    opacity: opacity.disabled,
  },
});
