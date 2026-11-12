import React, { useEffect, useState } from 'react';
import { AppModal, Button } from '@/shared/components';
import { PlanningStepView } from '../../types/planning';
import { DurationField } from '../DurationField';

export interface StepDurationModalProps {
  /** Step being edited; the modal is hidden when `null`. */
  step: PlanningStepView | null;
  isSaving: boolean;
  onSave: (stepId: string, durationMin: number) => void;
  onClose: () => void;
}

/** Organizer: changes a step's duration (the following steps are shifted). */
export const StepDurationModal: React.FC<StepDurationModalProps> = ({
  step,
  isSaving,
  onSave,
  onClose,
}) => {
  const [duration, setDuration] = useState<number | null>(step?.durationMin ?? null);

  useEffect(() => {
    setDuration(step?.durationMin ?? null);
  }, [step]);
  const title = step?.step.title;

  const isValid = duration !== null && duration > 0 && duration <= 24 * 60;

  return (
    <AppModal
      visible={step !== null}
      onClose={onClose}
      variant="sheet"
      title={title ? `Durée · ${title}` : 'Durée'}
      testID="modal-step-duration"
      footer={
        <Button
          title="Enregistrer la durée"
          fullWidth
          loading={isSaving}
          disabled={!isValid}
          onPress={() => {
            if (step && isValid) onSave(step.step.id, duration);
          }}
          testID="btn-save-step-duration"
        />
      }
    >
      <DurationField value={duration} onChange={setDuration} label="Durée de l'étape" />
    </AppModal>
  );
};
