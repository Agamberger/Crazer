import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../constants/theme';
import { DAY_NAMES, MONTH_NAMES } from './constants';

export interface CalendarPickerViewProps {
  selectedDate: Date;
  viewYear: number;
  viewMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
  /** Overrides the single-date selection (e.g. several selected days). */
  isDaySelected?: (day: number) => boolean;
  /** Disables some days of the viewed month (e.g. past days). */
  isDayDisabled?: (day: number) => boolean;
  /** Disables the previous-month button (e.g. when viewing the current month). */
  disablePrevMonth?: boolean;
}

export const CalendarPickerView: React.FC<CalendarPickerViewProps> = ({
  selectedDate,
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  isDaySelected,
  isDayDisabled,
  disablePrevMonth = false,
}) => {
  // Calcul des cases du calendrier
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0 = Lundi
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const calendarCells: { day: number; isCurrentMonth: boolean }[] = [];

  // Jours du mois précédent
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }

  // Jours du mois actuel
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, isCurrentMonth: true });
  }

  // Jours du mois suivant pour compléter les semaines (grille de 35 ou 42)
  const remainingCells = (7 - (calendarCells.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    calendarCells.push({ day: d, isCurrentMonth: false });
  }

  // One row per week, so the grid never wraps differently depending on the container width.
  const weeks = Array.from({ length: calendarCells.length / 7 }, (_, i) =>
    calendarCells.slice(i * 7, i * 7 + 7),
  );

  return (
    <View style={styles.calendarContainer}>
      {/* Entête navigation mois/année */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={onPrevMonth}
          style={[styles.navButton, disablePrevMonth && styles.dayCellDisabled]}
          disabled={disablePrevMonth}
          testID="btn-prev-month"
          accessibilityRole="button"
          accessibilityLabel="Mois précédent"
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.monthTitle} testID="month-title">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity
          onPress={onNextMonth}
          style={styles.navButton}
          testID="btn-next-month"
          accessibilityRole="button"
          accessibilityLabel="Mois suivant"
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Jours de la semaine */}
      <View style={styles.weekHeader}>
        {DAY_NAMES.map((d) => (
          <Text key={d} style={styles.weekDayText}>
            {d}
          </Text>
        ))}
      </View>

      {/* Grille des jours */}
      <View style={styles.daysGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((cell, dayIndex) => {
              const index = weekIndex * 7 + dayIndex;
              const isSelected =
                cell.isCurrentMonth &&
                (isDaySelected
                  ? isDaySelected(cell.day)
                  : cell.day === selectedDate.getDate() &&
                    viewMonth === selectedDate.getMonth() &&
                    viewYear === selectedDate.getFullYear());
              const isDisabled = !cell.isCurrentMonth || (isDayDisabled?.(cell.day) ?? false);

              return (
                <TouchableOpacity
                  key={`${index}-${cell.day}`}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isDisabled && styles.dayCellDisabled,
                  ]}
                  disabled={isDisabled}
                  accessibilityState={
                    cell.isCurrentMonth ? { selected: isSelected, disabled: isDisabled } : undefined
                  }
                  onPress={() => onSelectDay(cell.day)}
                  testID={cell.isCurrentMonth ? `day-cell-${cell.day}` : undefined}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isDisabled && styles.dayTextDisabled,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    marginTop: spacing.sm,
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  dayTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  daysGrid: {
    gap: 4,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  navButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
    padding: spacing.xs,
  },
  weekDayText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
    width: 38,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
});
