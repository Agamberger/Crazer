import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  ChipGroup,
  ConfirmDialog,
  DateTimeField,
  InlineAlert,
  TextField,
} from '@/shared/components';
import { colors, spacing } from '@/shared/constants/theme';
import { PlannedOutingRow, PlannedOutingStatus, PlannedOutingUpdate } from '@/shared/types';
import { PLANNED_STATUS_OPTIONS } from '../constants';
import { DurationField } from './DurationField';

export interface PlannedOutingEditFormProps {
  plannedOuting: PlannedOutingRow;
  parentOutingTitle?: string;
  onSubmit: (updates: PlannedOutingUpdate) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  error?: string | null;
  submitTestID?: string;
  cancelTestID?: string;
  deleteTestID?: string;
}

export const PlannedOutingEditForm: React.FC<PlannedOutingEditFormProps> = ({
  plannedOuting,
  parentOutingTitle,
  onSubmit,
  onDelete,
  onCancel,
  isLoading = false,
  isDeleting: propIsDeleting = false,
  error = null,
  submitTestID,
  cancelTestID,
  deleteTestID,
}) => {
  const [title, setTitle] = useState(plannedOuting.title);
  const [description, setDescription] = useState(plannedOuting.description || '');
  const [notes, setNotes] = useState(plannedOuting.notes || '');
  const [scheduledFor, setScheduledFor] = useState(new Date(plannedOuting.scheduled_for));
  const [durationMin, setDurationMin] = useState<number | null>(plannedOuting.duration_min);
  const [status, setStatus] = useState<PlannedOutingStatus>(plannedOuting.status);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingInternal, setIsSubmittingInternal] = useState(false);
  const [isDeletingInternal, setIsDeletingInternal] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setFormError("Le nom de l'étape est obligatoire.");
      return;
    }
    setFormError(null);
    setIsSubmittingInternal(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        notes: notes.trim() || null,
        scheduled_for: scheduledFor.toISOString(),
        duration_min: durationMin,
        status,
      });
    } finally {
      setIsSubmittingInternal(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeletingInternal(true);
    try {
      await onDelete(plannedOuting.id);
    } finally {
      setIsDeletingInternal(false);
      setIsConfirmingDelete(false);
    }
  };

  const isDeletingActive = propIsDeleting || isDeletingInternal;
  const isSavingActive = isSubmittingInternal || (isLoading && !isDeletingActive);
  const isAnyLoading = isLoading || isSavingActive || isDeletingActive;
  const displayError = formError || error;

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      testID="planned-outing-edit-form"
    >
      <View style={styles.headerNav}>
        <Button
          title="Retour"
          variant="ghost"
          size="sm"
          leftIcon="arrow-back"
          onPress={onCancel}
          accessibilityLabel="Retour à la sortie"
          testID="btn-back-to-outing"
        />
        {parentOutingTitle ? (
          <AppText variant="caption" color="muted" numberOfLines={1} style={styles.parentTitle}>
            Sortie : {parentOutingTitle}
          </AppText>
        ) : null}
      </View>

      <Card style={styles.formCard}>
        <AppText variant="h3" weight="bold" style={styles.formTitle}>
          Modifier l&apos;étape
        </AppText>

        {displayError ? <InlineAlert message={displayError} testID="error-container" /> : null}

        <TextField
          label="Nom de l'étape *"
          placeholder="Ex: Bar Le Centenaire, Escape Game..."
          value={title}
          onChangeText={setTitle}
          accessibilityLabel="Nom de l'étape"
          testID="input-planned-title"
        />

        <ChipGroup
          label="Statut de l'étape"
          options={PLANNED_STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
          testID="btn-planned-status"
        />

        <DateTimeField
          label="Date et heure planifiée"
          value={scheduledFor}
          onChange={setScheduledFor}
          testIDScope="planned"
        />

        <DurationField value={durationMin} onChange={setDurationMin} />

        <TextField
          label="Description"
          placeholder="Détails du programme, consignes, réservations..."
          value={description}
          onChangeText={setDescription}
          multiline
          minHeight={80}
          numberOfLines={3}
          accessibilityLabel="Description de l'étape"
          testID="input-planned-description"
        />

        <TextField
          label="Notes & infos pratiques"
          placeholder="Code porte, contact, numéro de table, itinéraire..."
          value={notes}
          onChangeText={setNotes}
          multiline
          minHeight={64}
          numberOfLines={2}
          accessibilityLabel="Notes et informations pratiques"
          testID="input-planned-notes"
        />

        <View style={styles.primaryActionsRow}>
          <Button
            title="Annuler"
            variant="outline"
            size="sm"
            onPress={onCancel}
            disabled={isAnyLoading}
            style={styles.actionButton}
            testID={cancelTestID || 'btn-cancel-planned'}
          />
          <Button
            title="Enregistrer"
            size="sm"
            loading={isSavingActive}
            disabled={isAnyLoading}
            onPress={handleSubmit}
            style={styles.actionButton}
            testID={submitTestID || 'btn-submit-planned'}
          />
        </View>

        {onDelete ? (
          <Button
            title="Supprimer"
            variant="danger"
            size="sm"
            leftIcon="trash-outline"
            loading={isDeletingActive}
            disabled={isAnyLoading}
            onPress={() => setIsConfirmingDelete(true)}
            fullWidth
            style={styles.deleteButton}
            testID={deleteTestID || 'btn-delete-planned'}
          />
        ) : null}
      </Card>

      <ConfirmDialog
        visible={isConfirmingDelete}
        title="Supprimer l'étape"
        message={`Êtes-vous sûr de vouloir supprimer "${plannedOuting.title}" ?`}
        confirmLabel="Supprimer"
        destructive
        loading={isDeletingActive}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmingDelete(false)}
        testID="confirm-delete-planned"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  formCard: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  formTitle: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerNav: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  parentTitle: {
    fontStyle: 'italic',
    marginRight: spacing.sm,
    maxWidth: 200,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  scrollContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
