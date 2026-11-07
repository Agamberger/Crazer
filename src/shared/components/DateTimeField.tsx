import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, iconSizes, opacity, radii, spacing, typography } from '@/shared/constants/theme';
import { ThemedDateTimePicker } from './DateTimePicker';
import { IconName } from './types';

type PickerMode = 'date' | 'time';

export interface DateTimeFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /**
   * Portée des testID. Sans valeur : `btn-select-date`, `formatted-date-text`…
   * Avec `planned` : `btn-select-planned-date`, `formatted-planned-date-text`…
   */
  testIDScope?: string;
}

export const formatFieldDate = (date: Date): string =>
  date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatFieldTime = (date: Date): string =>
  date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface PickerButtonProps {
  icon: IconName;
  label: string;
  value: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
  valueTestID: string;
}

const PickerButton: React.FC<PickerButtonProps> = ({
  icon,
  label,
  value,
  active,
  disabled,
  onPress,
  testID,
  valueTestID,
}) => (
  <TouchableOpacity
    style={[styles.button, active && styles.buttonActive, disabled && styles.disabled]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={opacity.pressed}
    accessibilityRole="button"
    accessibilityLabel={`${label} : ${value}`}
    accessibilityHint={`Modifier ${label.toLowerCase()}`}
    testID={testID}
  >
    <View style={styles.buttonHeader}>
      <Ionicons
        name={icon}
        size={iconSizes.sm}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.buttonLabel, active && styles.buttonLabelActive]}>{label}</Text>
    </View>
    <Text style={styles.buttonValue} testID={valueTestID}>
      {value}
    </Text>
  </TouchableOpacity>
);

/** Champ « Date + Heure » qui ouvre le sélecteur thémé de Crazer. */
export const DateTimeField: React.FC<DateTimeFieldProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  style,
  testIDScope,
}) => {
  const [openMode, setOpenMode] = useState<PickerMode | null>(null);
  const scope = testIDScope ? `${testIDScope}-` : '';

  const handleConfirm = (date: Date) => {
    setOpenMode(null);
    onChange(date);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <PickerButton
          icon="calendar-outline"
          label="Date"
          value={formatFieldDate(value)}
          active={openMode === 'date'}
          disabled={disabled}
          onPress={() => setOpenMode('date')}
          testID={`btn-select-${scope}date`}
          valueTestID={`formatted-${scope}date-text`}
        />
        <PickerButton
          icon="time-outline"
          label="Heure"
          value={formatFieldTime(value)}
          active={openMode === 'time'}
          disabled={disabled}
          onPress={() => setOpenMode('time')}
          testID={`btn-select-${scope}time`}
          valueTestID={`formatted-${scope}time-text`}
        />
      </View>

      <ThemedDateTimePicker
        visible={openMode !== null}
        value={value}
        mode={openMode ?? 'date'}
        onConfirm={handleConfirm}
        onCancel={() => setOpenMode(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.md - 2,
    borderWidth: 1.5,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  buttonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  buttonLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  buttonLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  buttonValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  container: {
    marginBottom: spacing.md,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
