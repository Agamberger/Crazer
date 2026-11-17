import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppModal, AppText, Button } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ProposeActivityInput, UseActivityVotesResult } from '../../hooks/useActivityVotes';
import { ActivityResult } from '../../types/activities';
import { ActivityVoteCard } from './ActivityVoteCard';
import { ProposeActivityForm } from './ProposeActivityForm';

export interface ActivityVotesContentProps {
  votes: UseActivityVotesResult;
  userId: string | null;
  /** Opens the map to pick a place that becomes a proposal. */
  onSearchOnMap: () => void;
  /** Adds an activity of the pool at the end of the programme. */
  onPlace?: (result: ActivityResult) => void;
  /** Handle to drag an activity onto the programme, injected by the screen that hosts it. */
  renderDragHandle?: (result: ActivityResult) => React.ReactNode;
}

/**
 * The activity pool, best score first, with live votes; an attendee adds a custom activity
 * (slide-over form) or looks for one on the map, and sends one to the programme.
 */
export const ActivityVotesContent: React.FC<ActivityVotesContentProps> = ({
  votes,
  userId,
  onSearchOnMap,
  onPlace,
  renderDragHandle,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const memberNames = useMemo(
    () => Object.fromEntries(votes.members.map((m) => [m.userId, m.displayName])),
    [votes.members],
  );

  const proposeCustom = async (input: ProposeActivityInput) => {
    const saved = await votes.propose(input);
    if (saved) setIsFormOpen(false);
    return saved;
  };

  return (
    <>
      {votes.pool.length === 0 ? (
        <AppText color="muted" testID="activity-pool-empty">
          Aucune activité dans la pool pour l’instant.
        </AppText>
      ) : null}
      {votes.pool.map((result) => (
        <ActivityVoteCard
          key={result.activity.id}
          result={result}
          memberNames={memberNames}
          canVote={votes.canVote}
          onVote={votes.toggleVote}
          onRemove={
            votes.isOrganizer || result.activity.proposedBy === userId ? votes.remove : undefined
          }
          onPlace={votes.canVote ? onPlace : undefined}
          dragHandle={votes.canVote ? renderDragHandle?.(result) : null}
        />
      ))}
      {votes.canVote ? (
        <View style={styles.actions}>
          <Button
            title="+ Activité perso"
            variant="secondary"
            size="sm"
            onPress={() => setIsFormOpen(true)}
            style={styles.action}
            testID="btn-custom-activity"
          />
          <Button
            title="🗺️ Chercher sur la carte"
            variant="outline"
            size="sm"
            onPress={onSearchOnMap}
            style={styles.action}
            testID="btn-activity-on-map"
          />
        </View>
      ) : (
        <AppText color="muted" testID="activities-cannot-vote">
          Rejoins la sortie pour proposer et voter.
        </AppText>
      )}
      <AppModal
        visible={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        variant="slideOver"
        title="Nouvelle activité"
        testID="custom-activity-panel"
      >
        <ProposeActivityForm onSubmit={proposeCustom} isSaving={votes.isSaving} />
      </AppModal>
    </>
  );
};

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
