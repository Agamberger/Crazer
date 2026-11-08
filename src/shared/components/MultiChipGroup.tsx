import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Chip } from './Chip';
import { ChipOption } from './ChipGroup';

export interface MultiChipGroupProps<T extends string | number> {
  options: ReadonlyArray<ChipOption<T>>;
  values: ReadonlyArray<T>;
  onChange: (values: T[]) => void;
  /** Title displayed above the group. */
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** testID prefix: each chip gets `${testID}-${value}`. */
  testID?: string;
}

/** Toggles a value in a list while keeping the options order. */
export function toggleChipValue<T extends string | number>(
  options: ReadonlyArray<ChipOption<T>>,
  values: ReadonlyArray<T>,
  value: T,
): T[] {
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  const order = options.map((option) => option.value);
  return [...next].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Multi-select chip group (days, friends…). */
export function MultiChipGroup<T extends string | number>({
  options,
  values,
  onChange,
  label,
  disabled = false,
  style,
  testID,
}: MultiChipGroupProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips} accessibilityLabel={label}>
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            emoji={option.emoji}
            icon={option.icon}
            selected={values.includes(option.value)}
            disabled={disabled}
            onPress={() => onChange(toggleChipValue(options, values, option.value))}
            testID={testID ? `${testID}-${option.value}` : undefined}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
});
