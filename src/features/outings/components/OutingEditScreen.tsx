import React from 'react';
import { StyleSheet } from 'react-native';
import { EmptyState, Loader, Screen } from '@/shared/components';
import { OutingRow, OutingUpdate, PlannedOutingRow } from '@/shared/types';
import { OUTINGS_SCREEN_EDGES } from '../constants';
import { OutingEditForm } from './OutingEditForm';

export interface OutingEditScreenProps {
  /** Outing being edited, `undefined` while loading or when it is not accessible. */
  outing: OutingRow | undefined;
  isLoading: boolean;
  error: string | null;
  plannedOutings: PlannedOutingRow[];
  onSubmit: (updates: OutingUpdate) => Promise<void> | void;
  onCancel: () => void;
  onSelectPlannedOuting: (plannedOuting: PlannedOutingRow) => void;
  onOpenParticipants?: () => void;
  onOpenActivities?: () => void;
  onOpenPlanning?: () => void;
}

/** Sorties tab, outing edition: loader, "not found" state or `OutingEditForm` with its steps. */
export const OutingEditScreen: React.FC<OutingEditScreenProps> = ({
  outing,
  isLoading,
  error,
  plannedOutings,
  onSubmit,
  onCancel,
  onSelectPlannedOuting,
  onOpenParticipants,
  onOpenActivities,
  onOpenPlanning,
}) => {
  if (isLoading && !outing) {
    return (
      <Screen edges={OUTINGS_SCREEN_EDGES} testID="loading-state">
        <Loader fullScreen message="Chargement de la sortie..." />
      </Screen>
    );
  }

  if (!outing) {
    return (
      <Screen edges={OUTINGS_SCREEN_EDGES} contentStyle={styles.center} testID="not-found-state">
        <EmptyState
          icon="help-circle-outline"
          title="Sortie introuvable"
          description="La sortie demandée n'existe pas ou vous n'avez pas les autorisations nécessaires."
          actionLabel="Retour aux sorties"
          onAction={onCancel}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={OUTINGS_SCREEN_EDGES} padded={false}>
      <OutingEditForm
        outing={outing}
        onSubmit={onSubmit}
        isLoading={isLoading}
        error={error}
        onCancel={onCancel}
        plannedOutings={plannedOutings}
        onSelectPlannedOuting={onSelectPlannedOuting}
        onOpenParticipants={onOpenParticipants}
        onOpenActivities={onOpenActivities}
        onOpenPlanning={onOpenPlanning}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
  },
});
