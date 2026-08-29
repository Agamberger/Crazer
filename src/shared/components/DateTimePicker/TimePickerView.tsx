import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../../constants/theme';
import { HOURS_LIST, MINUTES_LIST } from './constants';

export interface TimePickerViewProps {
  selectedDate: Date;
  onSelectHour: (hour: number) => void;
  onSelectMinute: (minute: number) => void;
}

export const TimePickerView: React.FC<TimePickerViewProps> = ({
  selectedDate,
  onSelectHour,
  onSelectMinute,
}) => {
  const currentHour = selectedDate.getHours();
  const currentMinute = selectedDate.getMinutes();

  return (
    <View style={styles.timeContainer}>
      {/* Aperçu digital de l'heure */}
      <View style={styles.timePreviewContainer}>
        <Text style={styles.timePreview}>
          {String(currentHour).padStart(2, '0')} : {String(currentMinute).padStart(2, '0')}
        </Text>
      </View>

      <View style={styles.timeColumnsContainer}>
        {/* Colonne des heures */}
        <View style={styles.timeColumn}>
          <Text style={styles.timeColumnTitle}>Heures</Text>
          <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
            {HOURS_LIST.map((h) => {
              const isSelected = h === currentHour;
              return (
                <TouchableOpacity
                  key={`h-${h}`}
                  style={[styles.timeItem, isSelected && styles.timeItemSelected]}
                  onPress={() => onSelectHour(h)}
                  testID={`hour-${h}`}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeItemText,
                      isSelected && styles.timeItemTextSelected,
                    ]}
                  >
                    {String(h).padStart(2, '0')} h
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Colonne des minutes */}
        <View style={styles.timeColumn}>
          <Text style={styles.timeColumnTitle}>Minutes</Text>
          <ScrollView style={styles.timeScroll} showsVerticalScrollIndicator={false}>
            {MINUTES_LIST.map((m) => {
              const isSelected = Math.abs(m - currentMinute) < 3;
              return (
                <TouchableOpacity
                  key={`m-${m}`}
                  style={[styles.timeItem, isSelected && styles.timeItemSelected]}
                  onPress={() => onSelectMinute(m)}
                  testID={`minute-${m}`}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.timeItemText,
                      isSelected && styles.timeItemTextSelected,
                    ]}
                  >
                    {String(m).padStart(2, '0')} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timeColumn: {
    flex: 1,
  },
  timeColumnTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  timeColumnsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeContainer: {
    marginTop: spacing.sm,
  },
  timeItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs + 2,
  },
  timeItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  timeItemText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  timeItemTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  timePreview: {
    color: colors.primary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  timePreviewContainer: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  timeScroll: {
    maxHeight: 180,
  },
});
