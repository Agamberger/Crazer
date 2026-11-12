import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, ChipGroup, TextField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { PickedPlace } from '../../types/activityPlaces';
import { DayKey } from '../../types/scheduling';
import { ACTIVITY_NOTE_MAX_LENGTH, ACTIVITY_TITLE_MAX_LENGTH } from '../../utils/activityUtils';
import { formatDayLabel } from '../../utils/availabilityUtils';
import { ActivityPlacePicker } from './ActivityPlacePicker';

export interface ProposeActivityFormProps {
  days: ReadonlyArray<DayKey>;
  userId: string | null;
  /** Resolves `true` when the activity was saved (the form is then cleared). */
  onSubmit: (input: {
    day: DayKey | null;
    title: string;
    note: string;
    placeId: string | null;
  }) => Promise<boolean>;
  isSaving: boolean;
}

const ANY_DAY = 'any';

/** « Proposer une activité » : title, optional note and the day it is proposed for. */
export const ProposeActivityForm: React.FC<ProposeActivityFormProps> = ({
  days,
  userId,
  onSubmit,
  isSaving,
}) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const [dayChoice, setDayChoice] = useState<string>(ANY_DAY);

  const dayOptions = [
    { value: ANY_DAY, label: 'Peu importe' },
    ...days.map((day) => ({ value: day, label: formatDayLabel(day) })),
  ];

  const submit = async () => {
    const saved = await onSubmit({
      day: dayChoice === ANY_DAY ? null : dayChoice,
      title,
      note,
      placeId: place?.id ?? null,
    });
    if (saved) {
      setTitle('');
      setNote('');
      setPlace(null);
    }
  };

  const pickPlace = (picked: PickedPlace | null) => {
    setPlace(picked);
    if (picked && title.trim().length === 0) setTitle(picked.name);
  };

  return (
    <View style={styles.container} testID="propose-activity-form">
      <TextField
        label="Proposer une activité"
        placeholder="Bowling, resto, balade..."
        value={title}
        onChangeText={setTitle}
        maxLength={ACTIVITY_TITLE_MAX_LENGTH}
        testID="input-activity-title"
      />
      <ActivityPlacePicker userId={userId} value={place} onChange={pickPlace} />
      <TextField
        placeholder="Un détail ? (facultatif)"
        value={note}
        onChangeText={setNote}
        maxLength={ACTIVITY_NOTE_MAX_LENGTH}
        testID="input-activity-note"
      />
      {days.length > 0 ? (
        <ChipGroup
          label="Pour quel jour ?"
          options={dayOptions}
          value={dayChoice}
          onChange={setDayChoice}
          testID="chips-activity-day"
        />
      ) : null}
      <Button
        title="Proposer"
        fullWidth
        disabled={title.trim().length === 0}
        loading={isSaving}
        onPress={submit}
        testID="btn-propose-activity"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
});
