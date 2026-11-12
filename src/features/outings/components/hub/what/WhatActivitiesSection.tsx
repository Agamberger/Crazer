import React from 'react';
import { InlineAlert, Loader } from '@/shared/components';
import { useActivityVotes } from '../../../hooks/useActivityVotes';
import { ActivityResult } from '../../../types/activities';
import { ActivityVotesContent } from '../../activities/ActivityVotesContent';

export interface WhatActivitiesSectionProps {
  outingId: string;
  userId: string | null;
  onOpenTie: (day: string | null) => void;
  onConvert: (result: ActivityResult) => void;
}

/** Activity proposals and live votes of the outing. */
export const WhatActivitiesSection: React.FC<WhatActivitiesSectionProps> = ({
  outingId,
  userId,
  onOpenTie,
  onConvert,
}) => {
  const votes = useActivityVotes(outingId);

  if (votes.loadFailed) {
    return (
      <InlineAlert
        tone="error"
        message="Impossible de charger les propositions. Réessaie plus tard."
      />
    );
  }
  if (!votes.isReady) return <Loader message="Chargement des activités..." />;

  return (
    <ActivityVotesContent
      votes={votes}
      userId={userId}
      onOpenTie={onOpenTie}
      onConvert={onConvert}
    />
  );
};
