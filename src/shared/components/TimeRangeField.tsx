import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, iconSizes, opacity, radii, spacing, typography } from '@/shared/constants/theme';
import { ThemedDateTimePicker } from './DateTimePicker';

/** A time range expressed as `HH:mm` strings (e.g. `{ start: '18:00', end: '23:00' }`). */
export interface TimeRange {
  start: string;
  end: string;
}

export interface TimeRangeFieldProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** testID prefix: `${testID}-start`, `${testID}-end`, `${testID}-error`. */
  testID?: string;
}

type Bound = keyof TimeRange;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Converts `HH:mm` to a Date (today) for the picker. */
export const timeStringToDate = (time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
};

/** Converts a Date to `HH:mm`. */
export const dateToTimeString = (date: Date): string =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** `HH:mm` strings compare lexicographically, so `end > start` is a valid range check. */
export const isValidTimeRange = (range: TimeRange): boolean => range.end > range.start;

/** Formats `18:00` as `18h`, `18:30` as `18h30`. */
export const formatTimeLabel = (time: string): string => {
  const [hours, minutes] = time.split(':');
  return minutes === '00' ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
};

/** Two time buttons (« De » / « À ») with the themed picker in time-only mode. */
export const TimeRangeField: React.FC<TimeRangeFieldProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  style,
  testID = 'time-range',
}) => {
  const [openBound, setOpenBound] = useState<Bound | null>(null);
  const pickerValue = useMemo(
    () => timeStringToDate(openBound ? value[openBound] : value.start),
    [openBound, value],
  );
  const valid = isValidTimeRange(value);

  const handleConfirm = (date: Date) => {
    if (openBound) onChange({ ...value, [openBound]: dateToTimeString(date) });
    setOpenBound(null);
  };

  const renderButton = (bound: Bound, title: string) => (
    <TouchableOpacity
      style={[styles.button, openBound === bound && styles.buttonActive, disabled && styles.disabled]}
      onPress={() => setOpenBound(bound)}
      disabled={disabled}
      activeOpacity={opacity.pressed}
      accessibilityRole="button"
      accessibilityLabel={`${label ? `${label}, ` : ''}${title} ${formatTimeLabel(value[bound])}`}
      testID={`${testID}-${bound}`}
    >
      <Ionicons name="time-outline" size={iconSizes.sm} color={colors.textSecondary} />
      <Text style={styles.buttonTitle}>{title}</Text>
      <Text style={styles.buttonValue}>{formatTimeLabel(value[bound])}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {renderButton('start', 'De')}
        {renderButton('end', 'À')}
      </View>
      {valid ? null : (
        <Text style={styles.error} testID={`${testID}-error`}>
          L’heure de fin doit être après l’heure de début.
        </Text>
      )}
      <ThemedDateTimePicker
        visible={openBound !== null}
        value={pickerValue}
        mode="time"
        lockMode
        onConfirm={handleConfirm}
        onCancel={() => setOpenBound(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.md - 2,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonActive: {
    borderColor: colors.primary,
  },
  buttonTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
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
  error: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
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
