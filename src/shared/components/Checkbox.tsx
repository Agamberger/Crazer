import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, iconSizes, opacity, radii, spacing, typography } from '@/shared/constants/theme';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  style,
  testID,
}) => (
  <TouchableOpacity
    style={[styles.row, disabled && styles.disabled, style]}
    onPress={() => onChange(!checked)}
    disabled={disabled}
    activeOpacity={opacity.pressed}
    accessibilityRole="checkbox"
    accessibilityState={{ checked, disabled }}
    accessibilityLabel={label}
    testID={testID}
  >
    <View style={[styles.box, checked && styles.boxChecked]}>
      {checked ? (
        <Ionicons name="checkmark" size={iconSizes.sm} color={colors.textPrimary} />
      ) : null}
    </View>
    {label || description ? (
      <View style={styles.texts}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: radii.sm - 2,
    borderWidth: 1.5,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  label: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  texts: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});
