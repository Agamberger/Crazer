import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, TextField } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ProposeActivityInput } from '../../hooks/useActivityVotes';
import { ACTIVITY_NOTE_MAX_LENGTH, ACTIVITY_TITLE_MAX_LENGTH } from '../../utils/activityUtils';

/** A saved place the proposal is about (picked on the map). */
export interface ProposalPlace {
  id: string;
  name: string;
}

export interface ProposeActivityFormProps {
  /** Place picked on the map: prefills the title and is linked to the proposal. */
  place?: ProposalPlace | null;
  /** Resolves `true` when the activity was saved (the form is then cleared). */
  onSubmit: (input: ProposeActivityInput) => Promise<boolean>;
  isSaving: boolean;
}

/** « Proposer une activité » : title and optional note of an activity added to the pool. */
export const ProposeActivityForm: React.FC<ProposeActivityFormProps> = ({
  place = null,
  onSubmit,
  isSaving,
}) => {
  const [title, setTitle] = useState(place?.name ?? '');
  const [note, setNote] = useState('');

  const submit = async () => {
    const saved = await onSubmit({
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
