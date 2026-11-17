import React from 'react';
import { InlineAlert, Loader } from '@/shared/components';
import { useActivityVotes } from '../../../hooks/useActivityVotes';
import { ActivityVotesContent } from '../../activities/ActivityVotesContent';
import { ActivityDragHandle } from './ProgrammeDragParts';

export interface WhatActivitiesSectionProps {
  outingId: string;
  userId: string | null;
  onSearchOnMap: () => void;
  /** Adds an activity of the pool at the end of the programme. */
  onPlace: (activityId: string) => void;
}

/** Activity proposals and live votes of the outing. */
export const WhatActivitiesSection: React.FC<WhatActivitiesSectionProps> = ({
  outingId,
  userId,
  onSearchOnMap,
  onPlace,
}) => {
  const votes = useActivityVotes(outingId);

  if (votes.loadFailed) {
    return (
      <InlineAlert
        tone="error"
        message="Impossible de charger les propositions. Réessaie plus tard."
        testID="what-activities-load-failed"
      />
    );
  }
  if (!votes.isReady) return <Loader message="Chargement des activités..." />;

  return (
    <ActivityVotesContent
      votes={votes}
      userId={userId}
      onSearchOnMap={onSearchOnMap}
      onPlace={(result) => onPlace(result.activity.id)}
      renderDragHandle={(result) => (
        <ActivityDragHandle activityId={result.activity.id} title={result.activity.title} />
      )}
    />
  );
};
