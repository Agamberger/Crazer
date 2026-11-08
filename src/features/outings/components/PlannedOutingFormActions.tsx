import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';

export interface PlannedOutingFormActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  /** Shows the "Supprimer" button when provided. */
  onRequestDelete?: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  disabled: boolean;
  submitTestID?: string;
  cancelTestID?: string;
  deleteTestID?: string;
}

/** Cancel / save buttons of a step form, and the optional delete button below them. */
export const PlannedOutingFormActions: React.FC<PlannedOutingFormActionsProps> = ({
  onCancel,
  onSubmit,
  onRequestDelete,
  isSaving,
  isDeleting,
  disabled,
  submitTestID,
  cancelTestID,
  deleteTestID,
}) => (
  <>
    <View style={styles.primaryActionsRow}>
      <Button
        title="Annuler"
        variant="outline"
        size="sm"
        onPress={onCancel}
        disabled={disabled}
        style={styles.actionButton}
        testID={cancelTestID || 'btn-cancel-planned'}
      />
      <Button
        title="Enregistrer"
        size="sm"
        loading={isSaving}
        disabled={disabled}
        onPress={onSubmit}
        style={styles.actionButton}
        testID={submitTestID || 'btn-submit-planned'}
      />
    </View>

    {onRequestDelete ? (
      <Button
        title="Supprimer"
        variant="danger"
        size="sm"
        leftIcon="trash-outline"
        loading={isDeleting}
        disabled={disabled}
        onPress={onRequestDelete}
        fullWidth
        style={styles.deleteButton}
        testID={deleteTestID || 'btn-delete-planned'}
      />
    ) : null}
  </>
);

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
