import React from 'react';
import { StyleProp, StyleSheet, Switch, Text, View, ViewStyle } from 'react-native';
import { colors, opacity, spacing, typography } from '@/shared/constants/theme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Interrupteur on/off thémé, avec label optionnel à gauche. */
export const Toggle: React.FC<ToggleProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  style,
  testID,
}) => (
  <View style={[styles.row, disabled && styles.disabled, style]}>
    {label || description ? (
      <View style={styles.texts}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    ) : null}
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.surfaceLight, true: colors.primary }}
      thumbColor={colors.white}
      ios_backgroundColor={colors.surfaceLight}
      accessibilityLabel={label}
      testID={testID}
    />
  </View>
);

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  texts: {
    flex: 1,
    marginRight: spacing.md,
  },
});
