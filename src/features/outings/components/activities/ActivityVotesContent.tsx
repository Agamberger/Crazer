import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppModal, AppText, Button } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { ProposeActivityInput, UseActivityVotesResult } from '../../hooks/useActivityVotes';
import { ActivityResult } from '../../types/activities';
import { ActivityGroupSection } from './ActivityGroupSection';
import { ProposeActivityForm } from './ProposeActivityForm';

export interface ActivityVotesContentProps {
  votes: UseActivityVotesResult;
  userId: string | null;
  onOpenTie: (day: string | null) => void;
  /** Turns a not retained activity into the title of a new outing. */
  onConvert: (result: ActivityResult) => void;
  /** Opens the map to pick a place that becomes a proposal. */
  onSearchOnMap: () => void;
}

/**
 * Activities grouped by day with their live results; an attendee adds a custom activity
 * (slide-over form) or looks for one on the map.
 */
export const ActivityVotesContent: React.FC<ActivityVotesContentProps> = ({
  votes,
  userId,
  onOpenTie,
  onConvert,
  onSearchOnMap,
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
      {votes.groups.map((group) => (
        <ActivityGroupSection
          key={group.day ?? 'any'}
          group={group}
          memberNames={memberNames}
          currentUserId={userId}
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
        <ProposeActivityForm days={votes.days} onSubmit={proposeCustom} isSaving={votes.isSaving} />
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
