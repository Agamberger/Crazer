import React from 'react';
import {
  AppText,
  Button,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  Loader,
  Screen,
  SectionHeader,
} from '@/shared/components';
import { useAvailabilityRecap } from '../../hooks/useAvailabilityRecap';
import { DayRecapRow } from './DayRecapRow';
import { MembersList } from './MembersList';

export interface AvailabilityRecapProps {
  outingId: string;
  /** Called once the organizer picked a day (outing becomes `planned`). */
  onPlanned: () => void;
  /** Called when the organizer goes on without choosing a day (the outing stays undated). */
  onContinue: () => void;
  onClose: () => void;
}

const pendingMessage = (count: number): string =>
  `En attente de ${count} réponse${count > 1 ? 's' : ''}.`;

interface RecapFooterProps {
  isOrganizer: boolean;
  onContinue: () => void;
  onClose: () => void;
}

/** « Continuer » (organizer only: opens the edit form) as primary action, « Fermer » as secondary. */
const RecapFooter: React.FC<RecapFooterProps> = ({ isOrganizer, onContinue, onClose }) => (
  <>
    {isOrganizer ? (
      <Button title="Continuer" fullWidth onPress={onContinue} testID="btn-recap-continue" />
    ) : null}
    <Button
      title="Fermer"
      variant={isOrganizer ? 'ghost' : 'outline'}
      fullWidth
      onPress={onClose}
      testID="btn-recap-close"
    />
  </>
);

/** Step 3 of the outing journey: live recap of the common slot per day. */
export const AvailabilityRecap: React.FC<AvailabilityRecapProps> = ({
  outingId,
  onPlanned,
  onContinue,
  onClose,
}) => {
  const recap = useAvailabilityRecap(outingId, onPlanned);

  if (!recap.outing || !recap.scheduling) {
    return (
      <Screen testID="recap-empty">
        {recap.isLoading || !recap.error ? (
          <Loader fullScreen message="Chargement des dispos..." />
        ) : (
          <EmptyState
            icon="help-circle-outline"
            title="Sortie introuvable"
            description={recap.error}
            actionLabel="Fermer"
            onAction={onClose}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      footer={
        <RecapFooter isOrganizer={recap.isOrganizer} onContinue={onContinue} onClose={onClose} />
      }
      testID="availability-recap"
    >
      <AppText variant="h2">{recap.outing.title}</AppText>
      <AppText color="secondary">Récap en direct des dispos de chacun.</AppText>

      {recap.pendingCount > 0 ? (
        <InlineAlert tone="info" message={pendingMessage(recap.pendingCount)} testID="recap-pending" />
      ) : null}

      <SectionHeader title="Créneau commun par jour" />
      {recap.recaps.map((dayRecap) => (
        <DayRecapRow
          key={dayRecap.day}
          recap={dayRecap}
          onChooseDay={recap.isOrganizer ? recap.chooseDay : undefined}
        />
      ))}

      <SectionHeader title="Qui vient ?" />
      <MembersList members={recap.scheduling.members} />

      <ConfirmDialog
        visible={recap.pendingChoice !== null}
        title="Continuer sans tout le monde ?"
        message={`${pendingMessage(recap.pendingCount)} Tu peux planifier la sortie maintenant ou attendre leurs dispos.`}
        confirmLabel="Planifier quand même"
        loading={recap.isSaving}
        onConfirm={recap.confirmPendingChoice}
        onCancel={recap.cancelPendingChoice}
      />
    </Screen>
  );
};
