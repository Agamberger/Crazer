import React from 'react';
import { Button, Screen } from '@/shared/components';
import { useCreateOutingWizard } from '../../hooks/useCreateOutingWizard';
import { CREATION_STEPS } from '../../store/useOutingCreationStore';
import { AvailabilityStep } from './AvailabilityStep';
import { InviteFriendsStep } from './InviteFriendsStep';
import { OutingDaysStep } from './OutingDaysStep';
import { OutingNameStep } from './OutingNameStep';
import { WizardHeader } from './WizardHeader';

export interface CreateOutingWizardProps {
  onCreated: (outingId: string) => void;
  onClose: () => void;
}

/** Step 1 of the outing journey: name, days, my availability, invitees. */
export const CreateOutingWizard: React.FC<CreateOutingWizardProps> = ({ onCreated, onClose }) => {
  const wizard = useCreateOutingWizard(onCreated);
  const { draft, step } = wizard;

  const footer = (
    <Button
      title={wizard.isLastStep ? "Envoyer l'invitation" : 'Suivant'}
      fullWidth
      disabled={!wizard.canContinue}
      loading={wizard.isSubmitting}
      onPress={wizard.next}
      testID="btn-wizard-next"
    />
  );

  return (
    <Screen
      scrollable
      avoidKeyboard
      header={
        <WizardHeader
          title="Nouvelle sortie"
          stepIndex={draft.stepIndex}
          stepCount={CREATION_STEPS.length}
          onBack={draft.previousStep}
          onClose={onClose}
        />
      }
      footer={footer}
      testID="create-outing-wizard"
    >
      {step === 'name' ? (
        <OutingNameStep title={draft.title} onChangeTitle={draft.setTitle} />
      ) : null}
      {step === 'days' ? (
        <OutingDaysStep
          heading="Quand ?"
          description="Sélectionne les jours possibles."
          selectedDays={draft.days}
          onChange={draft.setDays}
        />
      ) : null}
      {step === 'availability' ? (
        <AvailabilityStep days={draft.days} slots={draft.slots} onChangeSlot={draft.setSlot} />
      ) : null}
      {step === 'invitees' ? (
        <InviteFriendsStep
          friends={wizard.friends}
          selectedIds={draft.inviteeIds}
          onChange={draft.setInviteeIds}
          isLoading={wizard.isLoadingFriends}
        />
      ) : null}
    </Screen>
  );
};
