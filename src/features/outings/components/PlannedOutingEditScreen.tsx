import React from 'react';
import { StyleSheet } from 'react-native';
import { EmptyState, Loader, Screen } from '@/shared/components';
import { PlannedOutingRow, PlannedOutingUpdate } from '@/shared/types';
import { OUTINGS_SCREEN_EDGES } from '../constants';
import { PlannedOutingEditForm } from './PlannedOutingEditForm';

export interface PlannedOutingEditScreenProps {
  /** Step being edited, `undefined` while loading or when it no longer exists. */
  plannedOuting: PlannedOutingRow | undefined;
  parentOutingTitle?: string;
  isLoading: boolean;
  error: string | null;
  onSubmit: (updates: PlannedOutingUpdate) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onCancel: () => void;
}

/** Sorties tab, step edition: loader, "not found" state or `PlannedOutingEditForm`. */
export const PlannedOutingEditScreen: React.FC<PlannedOutingEditScreenProps> = ({
  plannedOuting,
  parentOutingTitle,
  isLoading,
  error,
  onSubmit,
  onDelete,
  onCancel,
}) => {
  if (isLoading && !plannedOuting) {
    return (
      <Screen edges={OUTINGS_SCREEN_EDGES} testID="planned-loading-state">
        <Loader fullScreen message="Chargement de l'étape..." />
      </Screen>
    );
  }

  if (!plannedOuting) {
    return (
      <Screen
        edges={OUTINGS_SCREEN_EDGES}
        contentStyle={styles.center}
        testID="planned-not-found-state"
      >
        <EmptyState
          icon="help-circle-outline"
          title="Étape introuvable"
          description="L'étape demandée n'existe pas ou a été supprimée."
          actionLabel="Retour à la sortie"
          onAction={onCancel}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={OUTINGS_SCREEN_EDGES} padded={false} testID="planned-outing-edit-screen">
      <PlannedOutingEditForm
        plannedOuting={plannedOuting}
        parentOutingTitle={parentOutingTitle}
        onSubmit={onSubmit}
        onDelete={onDelete}
        onCancel={onCancel}
        isLoading={isLoading}
        error={error}
        submitTestID="btn-submit-planned-edit"
        cancelTestID="btn-cancel-planned-edit"
        deleteTestID="btn-delete-planned-edit"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
  },
});
