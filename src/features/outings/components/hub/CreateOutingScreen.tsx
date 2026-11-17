import React from 'react';
import { Button, InlineAlert, Screen } from '@/shared/components';
import { CreationPlace, useCreateOuting } from '../../hooks/useCreateOuting';
import { OutingNameStep } from '../scheduling/OutingNameStep';
import { WizardHeader } from '../scheduling/WizardHeader';

export interface CreateOutingScreenProps {
  onCreated: (outingId: string) => void;
  onClose: () => void;
  /** Place the outing is created around: added as its first step. */
  place?: CreationPlace | null;
  /** Name the field starts with (e.g. a not retained activity turned into an outing). */
  initialTitle?: string;
}

/** « On sort ! »: names the outing, creates it and hands over to the outing hub. */
export const CreateOutingScreen: React.FC<CreateOutingScreenProps> = ({
  onCreated,
  onClose,
  place = null,
  initialTitle,
}) => {
  const creation = useCreateOuting(onCreated, place, initialTitle);

  return (
    <Screen
      scrollable
      avoidKeyboard
      header={
        <WizardHeader
          title="Nouvelle sortie"
          stepIndex={0}
          stepCount={1}
          onBack={onClose}
          onClose={onClose}
        />
      }
      footer={
        <Button
          title="Créer la sortie"
          fullWidth
          disabled={!creation.canSubmit}
          loading={creation.isSubmitting}
          onPress={() => void creation.submit()}
          testID="btn-create-outing"
        />
      }
      testID="create-outing-screen"
    >
      {place ? (
        <InlineAlert
          tone="info"
          message={`📍 ${place.name} sera ajouté comme première étape.`}
          testID="create-place-banner"
        />
      ) : null}
      <OutingNameStep title={creation.title} onChangeTitle={creation.setTitle} />
    </Screen>
  );
};
