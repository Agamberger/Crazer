import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, EmptyState, Loader, Screen } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { JOIN_STAGES, useJoinOutingFlow } from '../../hooks/useJoinOutingFlow';
import { AvailabilityStep } from './AvailabilityStep';
import { MembersList } from './MembersList';
import { OutingDaysStep } from './OutingDaysStep';
import { WizardHeader } from './WizardHeader';

export interface JoinOutingFlowProps {
  outingId: string;
  /** Called after joining, from the « Qui vient ? » stage. */
  onJoined: () => void;
  onDeclined: () => void;
  onClose: () => void;
}

/** Step 2 of the outing journey: an invitee joins and gives their availability. */
export const JoinOutingFlow: React.FC<JoinOutingFlowProps> = ({
  outingId,
  onJoined,
  onDeclined,
  onClose,
}) => {
  const flow = useJoinOutingFlow(outingId, onDeclined);

  if (!flow.outing) {
    return (
      <Screen testID="join-outing-empty">
        {flow.isLoading ? (
          <Loader fullScreen message="Chargement de l'invitation..." />
        ) : (
          <EmptyState
            icon="help-circle-outline"
            title="Invitation introuvable"
            description="Cette sortie n'existe plus ou tu n'y es pas invité."
            actionLabel="Fermer"
            onAction={onClose}
          />
        )}
      </Screen>
    );
  }

  const footer =
    flow.stage === 'invite' ? (
      <View style={styles.row}>
        <Button
          title="Refuser"
          variant="outline"
          onPress={flow.decline}
          disabled={flow.isSubmitting}
          style={styles.flex}
          testID="btn-decline-invitation"
        />
        <Button title="Rejoindre" onPress={flow.next} style={styles.flex} testID="btn-join" />
      </View>
    ) : (
      <Button
        title={flow.stage === 'members' ? 'Voir le récap' : flow.stage === 'availability' ? 'Envoyer mes dispos' : 'Suivant'}
        fullWidth
        disabled={!flow.canContinue}
        loading={flow.isSubmitting}
        onPress={flow.stage === 'members' ? onJoined : flow.next}
        testID="btn-join-next"
      />
    );

  return (
    <Screen
      scrollable
      header={
        <WizardHeader
          title={flow.outing.title}
          stepIndex={JOIN_STAGES.indexOf(flow.stage)}
          stepCount={JOIN_STAGES.length}
          onBack={flow.back}
          onClose={onClose}
        />
      }
      footer={footer}
      testID="join-outing-flow"
    >
      {flow.stage === 'invite' ? (
        <>
          <AppText color="secondary">
            Invité par {flow.organizerName ?? 'un ami'}
          </AppText>
          <AppText variant="h2">{flow.outing.title}</AppText>
          <AppText>Rejoindre ?</AppText>
        </>
      ) : null}
      {flow.stage === 'days' ? (
        <OutingDaysStep
          heading="Quel jour ?"
          description="Choisis les jours où tu peux venir."
          candidateDays={flow.candidateDays}
          selectedDays={flow.days}
          onChange={flow.setDays}
        />
      ) : null}
      {flow.stage === 'availability' ? (
        <AvailabilityStep days={flow.days} slots={flow.slots} onChangeSlot={flow.setSlot} />
      ) : null}
      {flow.stage === 'members' ? (
        <>
          <AppText variant="h2">Qui vient ?</AppText>
          <MembersList members={flow.members} />
        </>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
