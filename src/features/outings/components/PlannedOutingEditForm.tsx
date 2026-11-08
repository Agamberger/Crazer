import React from 'react';
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
import { PlannedOutingRow, PlannedOutingUpdate } from '@/shared/types';
import { PLANNED_STATUS_OPTIONS } from '../constants';
import { usePlannedOutingEditForm } from '../hooks/usePlannedOutingEditForm';
import { DurationField } from './DurationField';
import { PlannedOutingFormActions } from './PlannedOutingFormActions';

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
  const form = usePlannedOutingEditForm(plannedOuting, {
    onSubmit,
    onDelete,
    isLoading,
    isDeleting: propIsDeleting,
    error,
  });

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

        {form.displayError ? (
          <InlineAlert message={form.displayError} testID="error-container" />
        ) : null}

        <TextField
          label="Nom de l'étape *"
          placeholder="Ex: Bar Le Centenaire, Escape Game..."
          value={form.title}
          onChangeText={form.setTitle}
          accessibilityLabel="Nom de l'étape"
          testID="input-planned-title"
        />

        <ChipGroup
          label="Statut de l'étape"
          options={PLANNED_STATUS_OPTIONS}
          value={form.status}
          onChange={form.setStatus}
          testID="btn-planned-status"
        />

        <DateTimeField
          label="Date et heure planifiée"
          value={form.scheduledFor}
          onChange={form.setScheduledFor}
          testIDScope="planned"
        />

        <DurationField value={form.durationMin} onChange={form.setDurationMin} />

        <TextField
          label="Description"
          placeholder="Détails du programme, consignes, réservations..."
          value={form.description}
          onChangeText={form.setDescription}
          multiline
          minHeight={80}
          numberOfLines={3}
          accessibilityLabel="Description de l'étape"
          testID="input-planned-description"
        />

        <TextField
          label="Notes & infos pratiques"
          placeholder="Code porte, contact, numéro de table, itinéraire..."
          value={form.notes}
          onChangeText={form.setNotes}
          multiline
          minHeight={64}
          numberOfLines={2}
          accessibilityLabel="Notes et informations pratiques"
          testID="input-planned-notes"
        />

        <PlannedOutingFormActions
          onCancel={onCancel}
          onSubmit={form.handleSubmit}
          onRequestDelete={onDelete ? () => form.setIsConfirmingDelete(true) : undefined}
          isSaving={form.isSavingActive}
          isDeleting={form.isDeletingActive}
          disabled={form.isAnyLoading}
          submitTestID={submitTestID}
          cancelTestID={cancelTestID}
          deleteTestID={deleteTestID}
        />
      </Card>

      <ConfirmDialog
        visible={form.isConfirmingDelete}
        title="Supprimer l'étape"
        message={`Êtes-vous sûr de vouloir supprimer "${plannedOuting.title}" ?`}
        confirmLabel="Supprimer"
        destructive
        loading={form.isDeletingActive}
        onConfirm={form.handleConfirmDelete}
        onCancel={() => form.setIsConfirmingDelete(false)}
        testID="confirm-delete-planned"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: spacing.xxl,
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
  scrollContainer: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
