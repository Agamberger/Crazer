import React from 'react';
import { View } from 'react-native';
import { AppText, Button, EmptyState, Loader, Screen } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useAuth } from '@/features/auth';
import { useActivityVotes } from '../../hooks/useActivityVotes';
import { ActivityResult } from '../../types/activities';
import { ActivityVotesContent } from './ActivityVotesContent';

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
      <ActivityVotesContent
        votes={votes}
        userId={user?.id ?? null}
        onOpenTie={onOpenTie}
        onConvert={onConvert}
      />
    </Screen>
  );
};
