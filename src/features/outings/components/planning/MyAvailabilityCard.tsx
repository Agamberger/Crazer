import React, { useEffect, useState } from 'react';
import {
  AppText,
  Button,
  Card,
  isValidTimeRange,
  TimeRange,
  TimeRangeField,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { DEFAULT_TIME_RANGE } from '../../utils/availabilityUtils';

export interface MyAvailabilityCardProps {
  /** Current slot of the day, `null` when the user gave none. */
  slot: TimeRange | null;
  isSaving: boolean;
  onSave: (range: TimeRange) => void;
}

const CARD_STYLE = { gap: spacing.sm } as const;

/** Late arrival / early departure: the user adjusts their own slot of the day. */
export const MyAvailabilityCard: React.FC<MyAvailabilityCardProps> = ({ slot, isSaving, onSave }) => {
  const savedStart = slot?.start ?? DEFAULT_TIME_RANGE.start;
  const savedEnd = slot?.end ?? DEFAULT_TIME_RANGE.end;
  const [range, setRange] = useState<TimeRange>({ start: savedStart, end: savedEnd });

  useEffect(() => {
    setRange({ start: savedStart, end: savedEnd });
  }, [savedStart, savedEnd]);

  const isUnchanged = slot !== null && slot.start === range.start && slot.end === range.end;

  return (
    <Card style={CARD_STYLE} testID="planning-my-availability">
      <AppText weight="semibold">Mes horaires ce jour-là</AppText>
      <AppText variant="bodySmall" color="secondary">
        Tu arrives plus tard ou tu pars plus tôt ? Indique-le : le planning de tout le monde se met
        à jour.
      </AppText>
      <TimeRangeField value={range} onChange={setRange} testID="planning-my-slot" />
      <Button
        title="Enregistrer mes horaires"
        variant="secondary"
        loading={isSaving}
        disabled={isUnchanged || !isValidTimeRange(range)}
        onPress={() => onSave(range)}
        testID="btn-save-my-slot"
      />
    </Card>
  );
};
