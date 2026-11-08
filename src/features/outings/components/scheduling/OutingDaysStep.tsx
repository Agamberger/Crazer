import React, { useMemo } from 'react';
import { AppText, MultiChipGroup, MultiDateCalendar } from '@/shared/components';
import { DayKey } from '../../types/scheduling';
import { formatDayLabel } from '../../utils/availabilityUtils';

export interface OutingDaysStepProps {
  heading: string;
  description: string;
  /**
   * Days the user can choose from (invitee: the outing's candidate days, shown as chips).
   * Omitted: free choice in a month calendar, from today onwards (organizer).
   */
  candidateDays?: DayKey[];
  selectedDays: DayKey[];
  onChange: (days: DayKey[]) => void;
}

/** « Quand ? » / « Quel jour ? » — pick one or several days. */
export const OutingDaysStep: React.FC<OutingDaysStepProps> = ({
  heading,
  description,
  candidateDays,
  selectedDays,
  onChange,
}) => {
  const options = useMemo(
    () => (candidateDays ?? []).map((day) => ({ value: day, label: formatDayLabel(day) })),
    [candidateDays],
  );
  const today = useMemo(() => new Date(), []);

  return (
    <>
      <AppText variant="h2">{heading}</AppText>
      <AppText color="secondary">{description}</AppText>
      {candidateDays ? (
        <MultiChipGroup
          label="Jours"
          options={options}
          values={selectedDays}
          onChange={onChange}
          testID="chip-day"
        />
      ) : (
        <MultiDateCalendar
          values={selectedDays}
          onChange={onChange}
          minDate={today}
          testID="calendar-days"
        />
      )}
    </>
  );
};
