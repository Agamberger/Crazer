import { useState } from 'react';
import { OutingRow, ParticipantStatus } from '@/shared/types';
import { InvitationResponse, useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { OutingScheduling } from '../types/scheduling';
import { memberSlotsByDay, slotsToPayload } from '../utils/availabilityUtils';
import { PanelFeedback } from '../types/hub';

export interface UseMyAnswerResult {
  /** The user's participation, `null` for the organizer or a non member. */
  myStatus: ParticipantStatus | null;
  isSaving: boolean;
  feedback: PanelFeedback | null;
  /** Answers (or changes the answer to) the invitation, keeping the user's slots. */
  answer: (response: InvitationResponse) => Promise<void>;
}

const SUCCESS_MESSAGES: Record<InvitationResponse, string> = {
  accepted: 'Super, tu viens ! Donne tes dispos dans « Quand ? ».',
  maybe: 'Noté : peut-être.',
  declined: 'Noté : tu ne viens pas.',
};

/**
 * The user's own answer to the outing, from the « Qui ? » panel.
 * @param outing the outing.
 * @param scheduling its members and availabilities (`null` while loading).
 * @param userId the current user.
 * @param isOrganizer the organizer always comes and does not answer.
 */
export const useMyAnswer = (
  outing: Pick<OutingRow, 'id' | 'created_by'>,
  scheduling: OutingScheduling | null,
  userId: string | null,
  isOrganizer: boolean,
): UseMyAnswerResult => {
  const respondToInvitation = useOutingSchedulingStore((state) => state.respondToInvitation);
  const fetchScheduling = useOutingSchedulingStore((state) => state.fetchScheduling);
  const isSaving = useOutingSchedulingStore((state) => state.isSubmitting);
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);

  const me = scheduling?.members.find((member) => member.userId === userId);
  const myStatus = isOrganizer || !me ? null : me.status;

  const answer = async (response: InvitationResponse) => {
    if (!scheduling || !userId || response === myStatus) return;
    const mySlots = memberSlotsByDay(scheduling.availabilities, userId);
    try {
      await respondToInvitation(outing.id, response, slotsToPayload(Object.keys(mySlots), mySlots));
      await fetchScheduling(outing);
      setFeedback({ tone: 'success', message: SUCCESS_MESSAGES[response] });
    } catch {
      setFeedback({ tone: 'error', message: 'Impossible d’enregistrer ta réponse. Réessaie.' });
    }
  };

  return { myStatus, isSaving, feedback, answer };
};
