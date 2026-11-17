import { useState } from 'react';
import { toast } from '@/shared/store/useToastStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DayRecap } from '../types/scheduling';
import { buildStartDate } from '../utils/availabilityUtils';

export interface UseDayChoiceResult {
  isSaving: boolean;
  /** Day waiting for « continuer sans tout le monde ? », `null` otherwise. */
  pendingChoice: DayRecap | null;
  /** Chooses a day; asks for a confirmation first while some invitees have not answered. */
  chooseDay: (recap: DayRecap) => void;
  confirmPendingChoice: () => Promise<void>;
  cancelPendingChoice: () => void;
  /** Removes the chosen date: the outing becomes an undated `draft` again. */
  clearDay: () => Promise<boolean>;
}

/**
 * The organizer's choice of the outing day: `start_date` = day + start of the common slot,
 * status `planned`.
 * @param outingId the outing.
 * @param pendingCount invitees who have not answered yet.
 * @param onPlanned called once a day is saved.
 * @param notify shows the result as toasts (off inside a modal, where a toast stays hidden).
 * @param onFailed called when the day could not be saved.
 */
export const useDayChoice = (
  outingId: string,
  pendingCount: number,
  onPlanned: () => void,
  notify = true,
  onFailed?: () => void,
): UseDayChoiceResult => {
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const [pendingChoice, setPendingChoice] = useState<DayRecap | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const confirmDay = async (recap: DayRecap) => {
    if (!recap.commonSlot) return;
    setIsSaving(true);
    const updated = await updateOuting(outingId, {
      start_date: buildStartDate(recap.day, recap.commonSlot.start),
      status: 'planned',
    });
    setIsSaving(false);
    setPendingChoice(null);
    if (updated) {
      if (notify) toast.success('La sortie est planifiée.', { title: updated.title });
      onPlanned();
    } else {
      if (notify) toast.error('Impossible de planifier la sortie.', { title: 'Erreur' });
      onFailed?.();
    }
  };

  const clearDay = async () => {
    setIsSaving(true);
    const updated = await updateOuting(outingId, { start_date: null, status: 'draft' });
    setIsSaving(false);
    return updated !== null;
  };

  return {
    isSaving,
    pendingChoice,
    chooseDay: (recap) => {
      if (pendingCount > 0) setPendingChoice(recap);
      else void confirmDay(recap);
    },
    confirmPendingChoice: () => (pendingChoice ? confirmDay(pendingChoice) : Promise.resolve()),
    cancelPendingChoice: () => setPendingChoice(null),
    clearDay,
  };
};
