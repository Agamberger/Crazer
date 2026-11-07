import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  ChipGroup,
  DateTimeField,
  InlineAlert,
  TextField,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { DurationField } from '@/features/outings/components/DurationField';
import { PLANNED_STATUS_OPTIONS } from '@/features/outings/constants';
import { OutingRow, PlannedOutingStatus } from '@/shared/types';
import { PlaceItem } from '../types/carte';

export interface PlannedStepValues {
  title: string;
  description: string;
  notes: string;
  scheduledFor: Date;
  durationMin: number | null;
  status: PlannedOutingStatus;
}

export interface PlannedStepFormProps {
  initialValues: PlannedStepValues;
  onSubmit: (values: PlannedStepValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** Erreur serveur à afficher (la validation locale est gérée par le formulaire). */
  error?: string | null;
}

/** À l'ajout d'un lieu, seuls ces statuts ont du sens. */
const STATUS_OPTIONS = PLANNED_STATUS_OPTIONS.filter(
  (option) => option.value === 'pending' || option.value === 'confirmed',
);
const DEFAULT_DURATION_MIN = 60;

/** Pré-remplit l'étape avec les infos pratiques du lieu et la date de la sortie. */
export const buildPlannedStepValues = (outing: OutingRow, place: PlaceItem): PlannedStepValues => {
  const notes: string[] = [];
  if (place.address) notes.push(`Adresse : ${place.address}`);
  if (place.phone) notes.push(`Tél : ${place.phone}`);
  if (place.website) notes.push(`Site : ${place.website}`);
  if (place.priceRange) notes.push(`Prix : ${place.priceRange}`);
  if (place.openingHours && place.openingHours.length > 0) {
    notes.push(`Horaires :\n${place.openingHours.join('\n')}`);
  }

  return {
    title: place.title,
    description: place.description || '',
    notes: notes.join('\n\n'),
    scheduledFor: new Date(outing.start_date || Date.now()),
    durationMin: DEFAULT_DURATION_MIN,
    status: 'pending',
  };
};

/** Étape 2 de l'ajout d'un lieu : détails de l'étape planifiée. */
export const PlannedStepForm: React.FC<PlannedStepFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}) => {
  const [values, setValues] = useState<PlannedStepValues>(initialValues);
  const [validationError, setValidationError] = useState<string | null>(null);

  const setField =
    <K extends keyof PlannedStepValues>(key: K) =>
    (value: PlannedStepValues[K]) =>
      setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    if (!values.title.trim()) {
      setValidationError("Le nom de l'étape est obligatoire.");
      return;
    }
    setValidationError(null);
    onSubmit(values);
  };

  const displayError = validationError || error;

  return (
    <Card style={styles.card}>
      <TextField
        variant="title"
        label="Nom de l'étape"
        placeholder="Nom de l'étape..."
        value={values.title}
        onChangeText={(text) => {
          setField('title')(text);
          if (validationError) setValidationError(null);
        }}
        accessibilityLabel="Nom de l'étape"
        testID="input-planned-title"
      />

      {displayError ? <InlineAlert message={displayError} testID="error-container" /> : null}

      <ChipGroup
        label="Statut"
        options={STATUS_OPTIONS}
        value={values.status}
        onChange={setField('status')}
        testID="btn-status"
      />

      <DateTimeField
        label="Date et heure planifiée"
        value={values.scheduledFor}
        onChange={setField('scheduledFor')}
        testIDScope="planned"
      />

      <DurationField value={values.durationMin} onChange={setField('durationMin')} />

      <TextField
        label="Description"
        placeholder="Détails de l'étape ou activités prévues..."
        value={values.description}
        onChangeText={setField('description')}
        multiline
        minHeight={70}
        numberOfLines={3}
        accessibilityLabel="Description de l'étape"
        testID="input-planned-description"
      />

      <TextField
        label="Notes & infos pratiques"
        placeholder="Code de porte, numéro de réservation, consigne particulière..."
        value={values.notes}
        onChangeText={setField('notes')}
        multiline
        minHeight={70}
        numberOfLines={3}
        accessibilityLabel="Notes et informations pratiques"
        testID="input-planned-notes"
      />

      <View style={styles.actions}>
        <Button
          title="Annuler"
          variant="outline"
          size="sm"
          onPress={onCancel}
          style={styles.actionButton}
          testID="btn-cancel-planned-step"
        />
        <Button
          title="Ajouter à la sortie"
          size="sm"
          loading={isSubmitting}
          onPress={handleSubmit}
          style={styles.actionButton}
          testID="btn-submit-planned-step"
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    padding: spacing.md,
    width: '100%',
  },
});
