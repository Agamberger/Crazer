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
}

export const CalendarPickerView: React.FC<CalendarPickerViewProps> = ({
  selectedDate,
  viewYear,
  viewMonth,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
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

  return (
    <View style={styles.calendarContainer}>
      {/* Entête navigation mois/année */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={onPrevMonth}
          style={styles.navButton}
          testID="btn-prev-month"
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
        {calendarCells.map((cell, index) => {
          const isSelected =
            cell.isCurrentMonth &&
            cell.day === selectedDate.getDate() &&
            viewMonth === selectedDate.getMonth() &&
            viewYear === selectedDate.getFullYear();

          return (
            <TouchableOpacity
              key={`${index}-${cell.day}`}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                !cell.isCurrentMonth && styles.dayCellDisabled,
              ]}
              disabled={!cell.isCurrentMonth}
              onPress={() => onSelectDay(cell.day)}
              testID={cell.isCurrentMonth ? `day-cell-${cell.day}` : undefined}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  !cell.isCurrentMonth && styles.dayTextDisabled,
                ]}
              >
                {cell.day}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
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
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
});
