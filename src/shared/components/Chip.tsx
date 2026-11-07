import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, iconSizes, opacity, radii, spacing, typography } from '@/shared/constants/theme';
import { IconName } from './types';

export interface ChipProps {
  label: string;
  /** Emoji affiché devant le label (non lu par les lecteurs d'écran). */
  emoji?: string;
  selected?: boolean;
  /** Si fourni, la puce devient sélectionnable. */
  onPress?: () => void;
  /** Si fourni, affiche une croix de suppression. */
  onRemove?: () => void;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Par défaut : le label. */
  accessibilityLabel?: string;
  testID?: string;
}

/** Puce de filtre / centre d'intérêt, sélectionnable ou supprimable. */
export const Chip: React.FC<ChipProps> = ({
  label,
  emoji,
  selected = false,
  onPress,
  onRemove,
  icon,
  disabled = false,
  style,
  accessibilityLabel,
  testID,
}) => {
  const fg = selected ? colors.textPrimary : colors.textSecondary;
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={iconSizes.sm} color={fg} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {emoji ? <Text accessibilityElementsHidden>{`${emoji} `}</Text> : null}
        <Text>{label}</Text>
      </Text>
      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          disabled={disabled}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Retirer ${label}`}
          testID={testID ? `${testID}-remove` : undefined}
        >
          <Ionicons name="close" size={iconSizes.sm} color={fg} style={styles.remove} />
        </TouchableOpacity>
      ) : null}
    </>
  );
  const chipStyle = [styles.chip, selected && styles.selected, disabled && styles.disabled, style];

  if (onPress) {
    return (
      <TouchableOpacity
        style={chipStyle}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={opacity.pressed}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={chipStyle} testID={testID}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.xs + 2,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  remove: {
    marginLeft: spacing.xs,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
