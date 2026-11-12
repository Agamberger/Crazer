import { useAuth } from '@/features/auth';
import { useDayChoice } from './useDayChoice';
import { useOutingScheduling } from './useOutingScheduling';

/** Live recap + the organizer's « Choisir ce jour » action (with confirmation if answers are missing). */
export const useAvailabilityRecap = (outingId: string, onPlanned: () => void) => {
  const { user } = useAuth();
  const scheduling = useOutingScheduling(outingId);
  const dayChoice = useDayChoice(outingId, scheduling.pendingCount, onPlanned);

  return {
    ...scheduling,
    isOrganizer: !!user?.id && scheduling.outing?.created_by === user.id,
    isSaving: dayChoice.isSaving,
    pendingChoice: dayChoice.pendingChoice,
    chooseDay: dayChoice.chooseDay,
    confirmPendingChoice: dayChoice.confirmPendingChoice,
    cancelPendingChoice: dayChoice.cancelPendingChoice,
  };
};
