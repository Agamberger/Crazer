import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  ChipGroup,
  DateTimeField,
  InlineAlert,
  TextField,
} from '@/shared/components';
import { colors, spacing } from '@/shared/constants/theme';
import { OutingRow, OutingStatus, OutingUpdate, PlannedOutingRow } from '@/shared/types';
import { OUTING_STATUS_OPTIONS } from '../constants';
import { useOutingPlannedOutings } from '../hooks/useOutingPlannedOutings';
import { PlannedOutingsTimeline } from './PlannedOutingsTimeline';

export interface OutingEditFormProps {
  outing: OutingRow;
  onSubmit: (updates: OutingUpdate) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
  onCancel?: () => void;
  plannedOutings?: PlannedOutingRow[];
  onAddPlannedOuting?: () => Promise<void> | void;
  onAddFromMap?: () => void;
  isAddingPlannedOuting?: boolean;
  onSelectPlannedOuting?: (plannedOuting: PlannedOutingRow) => void;
}

export const OutingEditForm: React.FC<OutingEditFormProps> = ({
  outing,
  onSubmit,
  isLoading = false,
  error = null,
  onCancel,
  plannedOutings: propPlannedOutings,
  onAddPlannedOuting: propOnAddPlannedOuting,
  onAddFromMap: propOnAddFromMap,
  isAddingPlannedOuting = false,
  onSelectPlannedOuting: propOnSelectPlannedOuting,
}) => {
  const timeline = useOutingPlannedOutings(outing.id, {
    plannedOutings: propPlannedOutings,
    onAddPlannedOuting: propOnAddPlannedOuting,
    onAddFromMap: propOnAddFromMap,
    onSelectPlannedOuting: propOnSelectPlannedOuting,
  });

  const [title, setTitle] = useState(outing.title || '');
  const [description, setDescription] = useState(outing.description || '');
  const [startDate, setStartDate] = useState<Date>(() => {
    if (outing.start_date) {
      const parsed = new Date(outing.start_date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [status, setStatus] = useState<OutingStatus>(outing.status || 'draft');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Le titre de la sortie est obligatoire.');
      return;
    }

    const updates: OutingUpdate = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      start_date: startDate.toISOString(),
      status,
    };

    await onSubmit(updates);
  };

  const displayError = validationError || error;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.card}>
        <TextField
          variant="title"
          placeholder="Titre de la sortie..."
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (validationError) setValidationError(null);
          }}
          containerStyle={styles.titleField}
          accessibilityLabel="Titre de la sortie"
          testID="input-title"
        />

        {displayError ? <InlineAlert message={displayError} testID="error-container" /> : null}

        <TextField
          label="Description"
          placeholder="Détails du programme, lieu de rendez-vous..."
          value={description}
          onChangeText={setDescription}
          multiline
          minHeight={90}
          numberOfLines={4}
          accessibilityLabel="Description"
          testID="input-description"
        />

        <DateTimeField label="Date et heure de début" value={startDate} onChange={setStartDate} />

        <ChipGroup
          label="Statut de la sortie"
          options={OUTING_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          testID="btn-status"
        />

        <View style={styles.actionButtons}>
          {onCancel ? (
            <Button
              title="Annuler"
              variant="outline"
              size="sm"
              onPress={onCancel}
              style={styles.actionButton}
              testID="btn-cancel-outing-edit"
            />
          ) : null}

          <Button
            title="Enregistrer"
            size="sm"
            loading={isLoading}
            onPress={handleSubmit}
            style={styles.actionButton}
            testID="btn-submit-outing-edit"
          />
        </View>
      </Card>

      {/* Planned Outings timeline section */}
      <PlannedOutingsTimeline
        plannedOutings={timeline.plannedOutings}
        onAddPlannedOuting={timeline.addPlannedOuting}
        onAddFromMap={timeline.addFromMap}
        onSelectPlannedOuting={timeline.selectPlannedOuting}
        isLoading={timeline.isLoading}
        isAdding={isAddingPlannedOuting}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.lg,
    width: '100%',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  titleField: {
    marginBottom: spacing.lg,
  },
});
