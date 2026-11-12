import React, { useMemo } from 'react';
import { View } from 'react-native';
import { AppText, Button, EmptyState, Loader, Screen, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useAuth } from '@/features/auth';
import { useActivityVotes } from '../../hooks/useActivityVotes';
import { ActivityResult } from '../../types/activities';
import { ActivityGroupSection } from './ActivityGroupSection';
import { ProposeActivityForm } from './ProposeActivityForm';

export interface ActivityVotesProps {
  outingId: string;
  onOpenTie: (day: string | null) => void;
  /** Turns a not retained activity into the title of a new outing. */
  onConvert: (result: ActivityResult) => void;
  onClose: () => void;
  /** Opens the planning of the day (next step of the journey). */
  onOpenPlanning?: () => void;
}

const CONTENT_STYLE = { gap: spacing.md } as const;
const FOOTER_STYLE = { gap: spacing.xs } as const;

/** Step 5 of the outing journey: propose activities, vote and see the live results. */
export const ActivityVotes: React.FC<ActivityVotesProps> = ({
  outingId,
  onOpenTie,
  onConvert,
  onClose,
  onOpenPlanning,
}) => {
  const { user } = useAuth();
  const votes = useActivityVotes(outingId);
  const memberNames = useMemo(
    () => Object.fromEntries(votes.members.map((m) => [m.userId, m.displayName])),
    [votes.members],
  );

  if (votes.loadFailed) {
    return (
      <Screen testID="activities-load-failed">
        <EmptyState
          icon="help-circle-outline"
          title="Activités indisponibles"
          description="Impossible de charger les propositions. Réessaie plus tard."
          actionLabel="Fermer"
          onAction={onClose}
        />
      </Screen>
    );
  }

  if (!votes.isReady || !votes.outing) {
    return (
      <Screen testID="activities-loading">
        <Loader fullScreen message="Chargement des activités..." />
      </Screen>
    );
  }

  return (
    <Screen
      scrollable
      avoidKeyboard
      contentStyle={CONTENT_STYLE}
      footer={
        <View style={FOOTER_STYLE}>
          {onOpenPlanning ? (
            <Button
              title="Planifier la journée"
              fullWidth
              leftIcon="time-outline"
              onPress={onOpenPlanning}
              testID="btn-activities-planning"
            />
          ) : null}
          <Button
            title="Terminer"
            fullWidth
            variant={onOpenPlanning ? 'ghost' : 'primary'}
            onPress={onClose}
            testID="btn-activities-close"
          />
        </View>
      }
      testID="activity-votes"
    >
      <AppText variant="h2">{votes.outing.title}</AppText>
      <AppText color="secondary">
        Propose des idées et vote : « Partant » vaut 2 points, « Peut-être » 1 point. Les résultats
        se mettent à jour en direct.
      </AppText>
      {votes.groups.map((group) => (
        <ActivityGroupSection
          key={group.day ?? 'any'}
          group={group}
          memberNames={memberNames}
          currentUserId={user?.id ?? null}
          canVote={votes.canVote}
          isOrganizer={votes.isOrganizer}
          onVote={votes.toggleVote}
          onChoose={votes.choose}
          onRemove={votes.remove}
          onReopen={votes.reopen}
          onOpenTie={onOpenTie}
          onConvert={onConvert}
        />
      ))}
      {votes.canVote ? (
        <>
          <SectionHeader title="Nouvelle proposition" />
          <ProposeActivityForm
            days={votes.days}
            userId={user?.id ?? null}
            onSubmit={votes.propose}
            isSaving={votes.isSaving}
          />
        </>
      ) : (
        <AppText color="muted" testID="activities-cannot-vote">
          Rejoins la sortie pour proposer et voter.
        </AppText>
      )}
    </Screen>
  );
};
