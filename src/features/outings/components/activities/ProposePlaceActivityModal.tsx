import React from 'react';
import { AppModal, InlineAlert, Loader } from '@/shared/components';
import { ProposeActivityInput, useActivityVotes } from '../../hooks/useActivityVotes';
import { ProposalPlace, ProposeActivityForm } from './ProposeActivityForm';

export interface ProposePlaceActivityModalProps {
  /** Outing the place is proposed for; the modal is hidden while `null`. */
  outingId: string | null;
  /** Saved place picked on the map; the modal is hidden while `null`. */
  place: ProposalPlace | null;
  onClose: () => void;
  /** Called once the proposal is saved. */
  onProposed: () => void;
}

/** Map « + Proposer comme activité »: day and note of a proposal made from a place. */
export const ProposePlaceActivityModal: React.FC<ProposePlaceActivityModalProps> = ({
  outingId,
  place,
  onClose,
  onProposed,
}) => {
  const votes = useActivityVotes(outingId ?? undefined);

  const propose = async (input: ProposeActivityInput) => {
    const saved = await votes.propose(input);
    if (saved) onProposed();
    return saved;
  };

  return (
    <AppModal
      visible={outingId !== null && place !== null}
      onClose={onClose}
      variant="sheet"
      title="Proposer une activité"
      testID="propose-place-activity-modal"
    >
      {votes.loadFailed ? (
        <InlineAlert tone="error" message="Impossible de charger la sortie. Réessaie plus tard." />
      ) : null}
      {!votes.isReady && !votes.loadFailed ? <Loader message="Chargement de la sortie..." /> : null}
      {votes.isReady && !votes.canVote ? (
        <InlineAlert tone="info" message="Rejoins la sortie pour proposer une activité." />
      ) : null}
      {votes.isReady && votes.canVote && place ? (
        <ProposeActivityForm
          key={place.id}
          days={votes.days}
          place={place}
          onSubmit={propose}
          isSaving={votes.isSaving}
        />
      ) : null}
    </AppModal>
  );
};
