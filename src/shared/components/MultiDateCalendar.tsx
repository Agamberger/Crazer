import React, { useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Chip } from './Chip';
import { CalendarPickerView } from './DateTimePicker';

export interface MultiDateCalendarProps {
  /** Selected days, formatted `YYYY-MM-DD`. */
  values: ReadonlyArray<string>;
  onChange: (values: string[]) => void;
  /** Days before this date cannot be selected (default: no limit). */
  minDate?: Date;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local date parts → `YYYY-MM-DD`. */
export const toDateKey = (year: number, month: number, day: number): string =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

const formatChipLabel = (key: string): string => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

/**
 * Month calendar where several days can be picked, across any month.
 * The selected days are listed as removable chips below the grid.
 */
export const MultiDateCalendar: React.FC<MultiDateCalendarProps> = ({
  values,
  onChange,
  minDate,
  label,
  style,
  testID = 'multi-date-calendar',
}) => {
  // The month shown first: the earliest selected day, else `minDate` (or today).
  const [initial] = useState(() => {
    const first = [...values].sort()[0];
    if (first) {
      const [year, month] = first.split('-').map(Number);
      return { year, month: month - 1 };
    }
    const base = minDate ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  const minKey = minDate
    ? toDateKey(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;
  const isMinMonth =
    !!minDate && viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth();
  const sorted = [...values].sort();

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const toggle = (key: string) =>
    onChange(
      values.includes(key) ? values.filter((v) => v !== key) : [...values, key].sort(),
    );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <CalendarPickerView
        selectedDate={new Date(viewYear, viewMonth, 1)}
        viewYear={viewYear}
        viewMonth={viewMonth}
        onPrevMonth={() => shiftMonth(-1)}
        onNextMonth={() => shiftMonth(1)}
        disablePrevMonth={isMinMonth}
        isDaySelected={(day) => values.includes(toDateKey(viewYear, viewMonth, day))}
        isDayDisabled={(day) => minKey !== null && toDateKey(viewYear, viewMonth, day) < minKey}
        onSelectDay={(day) => toggle(toDateKey(viewYear, viewMonth, day))}
      />
      {sorted.length > 0 ? (
        <View style={styles.chips} accessibilityLabel="Jours sélectionnés">
          {sorted.map((key) => (
            <Chip
              key={key}
              label={formatChipLabel(key)}
              selected
              onRemove={() => toggle(key)}
              testID={`${testID}-selected-${key}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
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
