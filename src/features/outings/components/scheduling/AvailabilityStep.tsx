import React from 'react';
import { AppText, TimeRange, TimeRangeField } from '@/shared/components';
import { DayKey } from '../../types/scheduling';
import { formatDayLabel } from '../../utils/availabilityUtils';

export interface AvailabilityStepProps {
  days: DayKey[];
  slots: Record<DayKey, TimeRange>;
  onChangeSlot: (day: DayKey, range: TimeRange) => void;
}

/** « Mes dispos » — one time slot per selected day (organizer and invitees). */
export const AvailabilityStep: React.FC<AvailabilityStepProps> = ({ days, slots, onChangeSlot }) => (
  <>
    <AppText variant="h2">Mes dispos</AppText>
    <AppText color="secondary">Indique un créneau pour chaque jour.</AppText>
    {days.map((day) =>
      slots[day] ? (
        <TimeRangeField
          key={day}
          label={formatDayLabel(day)}
          value={slots[day]}
          onChange={(range) => onChangeSlot(day, range)}
          testID={`slot-${day}`}
        />
      ) : null,
    )}
  </>
);
