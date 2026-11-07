import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Chip } from './Chip';
import { IconName } from './types';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  /** Emoji affiché devant le label (ex : statut d'une sortie). */
  emoji?: string;
  icon?: IconName;
}

export interface ChipGroupProps<T extends string | number> {
  options: ReadonlyArray<ChipOption<T>>;
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** Titre affiché au-dessus du groupe. */
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Préfixe des testID : chaque puce reçoit `${testID}-${value}`. */
  testID?: string;
}

/** Groupe de puces à sélection unique (statut, durée, catégorie…). */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled = false,
  style,
  testID,
}: ChipGroupProps<T>) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => (
          <Chip
            key={String(option.value)}
            label={option.label}
            emoji={option.emoji}
            icon={option.icon}
            selected={option.value === value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
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
