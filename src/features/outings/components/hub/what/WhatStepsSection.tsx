import React from 'react';
import { AppModal, Button } from '@/shared/components';
import { PlannedOutingUpdate } from '@/shared/types';
import { useOutingPlannedOutings } from '../../../hooks/useOutingPlannedOutings';
import { useOutingsStore } from '../../../store/useOutingsStore';
import { PlannedOutingEditForm } from '../../PlannedOutingEditForm';
import { PlannedOutingsTimeline } from '../../PlannedOutingsTimeline';
import { ProgrammeDropSlot } from './ProgrammeDragParts';

export interface WhatStepsSectionProps {
  outingId: string;
  outingTitle: string;
  /** Closes the panel, then runs a navigation (map, planning screen). */
  onLeave: (navigate: () => void) => void;
  onOpenPlanning: () => void;
}

/**
 * Steps of the outing (timeline): add one (custom or from the map), edit or delete it in a
 * slide-over page, or open the planning of the day. The hub keeps its outing selected in the
 * outings store, which holds the steps of the selected outing only.
 */
export const WhatStepsSection: React.FC<WhatStepsSectionProps> = ({
  outingId,
  outingTitle,
  onLeave,
  onOpenPlanning,
}) => {
  const editedStepId = useOutingsStore((state) => state.selectedPlannedOutingId);
  const setEditedStepId = useOutingsStore((state) => state.setSelectedPlannedOutingId);
  const updatePlannedOuting = useOutingsStore((state) => state.updatePlannedOuting);
  const deletePlannedOuting = useOutingsStore((state) => state.deletePlannedOuting);
  const isSavingStep = useOutingsStore((state) => state.isLoadingPlannedOutings);
  const storeError = useOutingsStore((state) => state.error);

  const timeline = useOutingPlannedOutings(outingId, {
    onSelectPlannedOuting: (step) => setEditedStepId(step.id),
  });
  const editedStep = timeline.plannedOutings.find((step) => step.id === editedStepId);
  const closeEdition = () => setEditedStepId(null);

  const saveStep = async (updates: PlannedOutingUpdate) => {
    if (!editedStep) return;
    const updated = await updatePlannedOuting(editedStep.id, updates);
    if (updated) closeEdition();
  };

  const deleteStep = async (id: string) => {
    if (await deletePlannedOuting(id)) closeEdition();
  };

  return (
    <>
      <PlannedOutingsTimeline
        plannedOutings={timeline.plannedOutings}
        isLoading={timeline.isLoading}
        onAddPlannedOuting={() => void timeline.addPlannedOuting()}
        onAddFromMap={() => onLeave(timeline.addFromMap)}
        onSelectPlannedOuting={timeline.selectPlannedOuting}
        renderDropSlot={(index) => <ProgrammeDropSlot index={index} />}
      />
      <Button
        title="Planifier la journée"
        variant="secondary"
        leftIcon="time-outline"
        onPress={() => onLeave(onOpenPlanning)}
        testID="btn-what-planning"
      />
      <AppModal
        visible={editedStep !== undefined}
        onClose={closeEdition}
        variant="slideOver"
        title="Étape"
        testID="what-step-panel"
      >
        {editedStep ? (
          <PlannedOutingEditForm
            plannedOuting={editedStep}
            parentOutingTitle={outingTitle}
            onSubmit={saveStep}
            onDelete={deleteStep}
            onCancel={closeEdition}
            isLoading={isSavingStep}
            error={storeError}
          />
        ) : null}
      </AppModal>
    </>
  );
};
