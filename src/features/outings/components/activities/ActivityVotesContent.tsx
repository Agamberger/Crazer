import React, { useMemo } from 'react';
import { AppText, SectionHeader } from '@/shared/components';
import { UseActivityVotesResult } from '../../hooks/useActivityVotes';
import { ActivityResult } from '../../types/activities';
import { ActivityGroupSection } from './ActivityGroupSection';
import { ProposeActivityForm } from './ProposeActivityForm';

export interface ActivityVotesContentProps {
  votes: UseActivityVotesResult;
  userId: string | null;
  onOpenTie: (day: string | null) => void;
  /** Turns a not retained activity into the title of a new outing. */
  onConvert: (result: ActivityResult) => void;
}

/**
 * Activities grouped by day with their live results, and the proposal form
 * (shared by the activities screen and the « Quoi ? » panel of the hub).
 */
export const ActivityVotesContent: React.FC<ActivityVotesContentProps> = ({
  votes,
  userId,
  onOpenTie,
  onConvert,
}) => {
  const memberNames = useMemo(
    () => Object.fromEntries(votes.members.map((m) => [m.userId, m.displayName])),
    [votes.members],
  );

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
        <>
          <SectionHeader title="Nouvelle proposition" />
          <ProposeActivityForm
            days={votes.days}
            userId={userId}
            onSubmit={votes.propose}
            isSaving={votes.isSaving}
          />
        </>
      ) : (
        <AppText color="muted" testID="activities-cannot-vote">
          Rejoins la sortie pour proposer et voter.
        </AppText>
      )}
    </>
  );
};
