import { useState } from 'react';
import { TimeRange } from '@/shared/components';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { DayKey } from '../types/scheduling';
import { areSlotsValid, slotsToPayload, syncSlotsWithDays } from '../utils/availabilityUtils';
import { useOutingScheduling } from './useOutingScheduling';

/** Stages of « Les invités rejoignent »: Rejoindre ? → Quel jour ? → Dispos → Qui vient ? */
export type JoinStage = 'invite' | 'days' | 'availability' | 'members';
export const JOIN_STAGES: ReadonlyArray<JoinStage> = ['invite', 'days', 'availability', 'members'];

export const useJoinOutingFlow = (outingId: string, onDeclined: () => void) => {
  const { user } = useAuth();
  const { outing, scheduling, isLoading } = useOutingScheduling(outingId);
  const respondToInvitation = useOutingSchedulingStore((s) => s.respondToInvitation);
  const isSubmitting = useOutingSchedulingStore((s) => s.isSubmitting);

  const [stage, setStage] = useState<JoinStage>('invite');
  const [days, setDaysState] = useState<DayKey[]>([]);
  const [slots, setSlots] = useState<Record<DayKey, TimeRange>>({});

  const members = scheduling?.members ?? [];
  const organizerName = members.find((m) => m.isOrganizer)?.displayName ?? null;
  const myStatus = members.find((m) => m.userId === user?.id)?.status ?? null;

  const setDays = (next: DayKey[]) => {
    const sorted = [...next].sort();
    setDaysState(sorted);
    setSlots((current) => syncSlotsWithDays(sorted, current));
  };
  const setSlot = (day: DayKey, range: TimeRange) =>
    setSlots((current) => ({ ...current, [day]: range }));

  const decline = async () => {
    try {
      await respondToInvitation(outingId, 'declined', []);
      toast.info('Invitation refusée.');
      onDeclined();
    } catch {
      toast.error('Impossible de répondre à l’invitation.', { title: 'Erreur' });
    }
  };

  const submitAvailability = async () => {
    try {
      await respondToInvitation(outingId, 'accepted', slotsToPayload(days, slots));
      setStage('members');
    } catch {
      toast.error('Impossible d’envoyer tes dispos.', { title: 'Erreur' });
    }
  };

  const canContinue =
    stage === 'days' ? days.length > 0 : stage === 'availability' ? areSlotsValid(days, slots) : true;

  const next = () => {
    if (!canContinue) return;
    if (stage === 'invite') setStage('days');
    else if (stage === 'days') setStage('availability');
    else if (stage === 'availability') void submitAvailability();
  };

  const back = () => {
    const index = JOIN_STAGES.indexOf(stage);
    if (index > 0 && stage !== 'members') setStage(JOIN_STAGES[index - 1]);
  };

  return {
    outing,
    candidateDays: scheduling?.days ?? [],
    members,
    organizerName,
    myStatus,
    isLoading,
    isSubmitting,
    stage,
    days,
    slots,
    setDays,
    setSlot,
    canContinue,
    next,
    back,
    decline,
  };
};
