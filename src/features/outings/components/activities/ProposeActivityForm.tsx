import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ChipGroup, TextField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ProposeActivityInput } from '../../hooks/useActivityVotes';
import { DayKey } from '../../types/scheduling';
import { ACTIVITY_NOTE_MAX_LENGTH, ACTIVITY_TITLE_MAX_LENGTH } from '../../utils/activityUtils';
import { formatDayLabel } from '../../utils/availabilityUtils';

/** A saved place the proposal is about (picked on the map). */
export interface ProposalPlace {
  id: string;
  name: string;
}

export interface ProposeActivityFormProps {
  days: ReadonlyArray<DayKey>;
  /** Place picked on the map: prefills the title and is linked to the proposal. */
  place?: ProposalPlace | null;
  /** Resolves `true` when the activity was saved (the form is then cleared). */
  onSubmit: (input: ProposeActivityInput) => Promise<boolean>;
  isSaving: boolean;
}

const ANY_DAY = 'any';

/** « Proposer une activité » : title, optional note and the day it is proposed for. */
export const ProposeActivityForm: React.FC<ProposeActivityFormProps> = ({
  days,
  place = null,
  onSubmit,
  isSaving,
}) => {
  const [title, setTitle] = useState(place?.name ?? '');
  const [note, setNote] = useState('');
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
    }
  };

  return (
    <View style={styles.container} testID="propose-activity-form">
      {place ? (
        <AppText color="secondary" testID="propose-activity-place">
          📍 {place.name}
        </AppText>
      ) : null}
      <TextField
        label="Activité"
        placeholder="Bowling, resto, balade..."
        value={title}
        onChangeText={setTitle}
        maxLength={ACTIVITY_TITLE_MAX_LENGTH}
        testID="input-activity-title"
      />
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
        onPress={() => void submit()}
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
