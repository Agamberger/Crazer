import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppModal,
  AppText,
  Button,
  IconButton,
  TimeRange,
  TimeRangeField,
  Toggle,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OpeningPeriod, WeekDay } from '../types/contributions';
import { areValidOpeningPeriods } from '../utils/openingPeriods';

const WEEK: readonly { day: WeekDay; label: string }[] = [
  { day: 0, label: 'Lundi' },
  { day: 1, label: 'Mardi' },
  { day: 2, label: 'Mercredi' },
  { day: 3, label: 'Jeudi' },
  { day: 4, label: 'Vendredi' },
  { day: 5, label: 'Samedi' },
  { day: 6, label: 'Dimanche' },
];
const DEFAULT_RANGE: TimeRange = { start: '12:00', end: '22:00' };
/** Opening ranges per day: lunch and evening at most. */
const MAX_RANGES_PER_DAY = 2;

type WeekRanges = Record<WeekDay, TimeRange[]>;

const emptyWeek = (): WeekRanges => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });

/** Week grid from periods; only Crazer data, never Google's (terms of use). */
export const periodsToWeek = (periods: readonly OpeningPeriod[]): WeekRanges => {
  const week = emptyWeek();
  periods.forEach((period) => {
    if (week[period.day].length < MAX_RANGES_PER_DAY) {
      week[period.day].push({ start: period.open, end: period.close });
    }
  });
  return week;
};

/** Periods sent to the database from the week grid. */
export const weekToPeriods = (week: WeekRanges): OpeningPeriod[] =>
  WEEK.flatMap(({ day }) =>
    week[day].map((range) => ({ day, open: range.start, close: range.end })),
  );

export interface OpeningHoursEditorProps {
  visible: boolean;
  /** Starting point: hours already confirmed by the community, empty otherwise. */
  initialPeriods: readonly OpeningPeriod[];
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (periods: OpeningPeriod[]) => void;
}

/**
 * Weekly opening hours form: each day open or closed, one or two ranges (a range may end
 * after midnight). Never pre-filled with Google's hours.
 */
export const OpeningHoursEditor: React.FC<OpeningHoursEditorProps> = ({
  visible,
  initialPeriods,
  isSaving,
  onCancel,
  onSubmit,
}) => {
  const [week, setWeek] = useState<WeekRanges>(() => periodsToWeek(initialPeriods));

  useEffect(() => {
    if (visible) setWeek(periodsToWeek(initialPeriods));
  }, [visible, initialPeriods]);

  const periods = weekToPeriods(week);
  const canSubmit = periods.length > 0 && areValidOpeningPeriods(periods);

  const updateDay = (day: WeekDay, ranges: TimeRange[]) =>
    setWeek((current) => ({ ...current, [day]: ranges }));

  return (
    <AppModal
      visible={visible}
      onClose={onCancel}
      variant="fullScreen"
      title="Horaires d’ouverture"
      testID="opening-hours-editor"
      footer={
        <View style={styles.footer}>
          <Button title="Annuler" variant="ghost" onPress={onCancel} />
          <Button
            title="Proposer"
            disabled={!canSubmit}
            loading={isSaving}
            onPress={() => onSubmit(periods)}
            testID="opening-hours-submit"
          />
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption" color="secondary">
          Indique les horaires que tu connais. Ils seront affichés une fois confirmés par deux
          autres membres.
        </AppText>
        {WEEK.map(({ day, label }) => {
          const ranges = week[day];
          return (
            <View key={day} style={styles.day} testID={`opening-hours-day-${day}`}>
              <Toggle
                label={label}
                description={ranges.length === 0 ? 'Fermé' : undefined}
                value={ranges.length > 0}
                onValueChange={(isOpen) => updateDay(day, isOpen ? [DEFAULT_RANGE] : [])}
                testID={`opening-hours-open-${day}`}
              />
              {ranges.map((range, index) => (
                <View key={index} style={styles.range}>
                  <TimeRangeField
                    value={range}
                    allowOvernight
                    onChange={(next) =>
                      updateDay(
                        day,
                        ranges.map((item, i) => (i === index ? next : item)),
                      )
                    }
                    style={styles.rangeField}
                    testID={`opening-hours-range-${day}-${index}`}
                  />
                  {index > 0 ? (
                    <IconButton
                      icon="close"
                      size="sm"
                      accessibilityLabel={`Retirer la plage ${index + 1} du ${label.toLowerCase()}`}
                      onPress={() =>
                        updateDay(
                          day,
                          ranges.filter((_, i) => i !== index),
                        )
                      }
                    />
                  ) : null}
                </View>
              ))}
              {ranges.length > 0 && ranges.length < MAX_RANGES_PER_DAY ? (
                <Button
                  title="Ajouter une plage"
                  variant="ghost"
                  size="sm"
                  leftIcon="add"
                  onPress={() => updateDay(day, [...ranges, { start: '19:00', end: '23:00' }])}
                  testID={`opening-hours-add-${day}`}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  day: {
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  range: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  rangeField: {
    flex: 1,
  },
});
