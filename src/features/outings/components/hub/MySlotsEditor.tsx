import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, TimeRange, TimeRangeField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { DayKey } from '../../types/scheduling';
import { formatDayLabel } from '../../utils/availabilityUtils';

export interface MySlotsEditorProps {
  days: DayKey[];
  /** My slot of each day I am available; no entry = not available that day. */
  slots: Record<DayKey, TimeRange>;
  onChangeAvailable: (day: DayKey, available: boolean) => void;
  onChangeSlot: (day: DayKey, range: TimeRange) => void;
}

/** « Mes dispos »: for each candidate day, available or not, and my slot. */
export const MySlotsEditor: React.FC<MySlotsEditorProps> = ({
  days,
  slots,
  onChangeAvailable,
  onChangeSlot,
}) => (
  <View style={styles.container}>
    {days.map((day) => (
      <View key={day} style={styles.day}>
        <Checkbox
          label={formatDayLabel(day)}
          checked={slots[day] !== undefined}
          onChange={(checked) => onChangeAvailable(day, checked)}
          testID={`my-day-${day}`}
        />
        {slots[day] ? (
          <TimeRangeField
            value={slots[day]}
            onChange={(range) => onChangeSlot(day, range)}
            testID={`my-slot-${day}`}
          />
        ) : null}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  day: {
    gap: spacing.xs,
  },
});
