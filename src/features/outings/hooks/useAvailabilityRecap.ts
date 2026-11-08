import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DayRecap } from '../types/scheduling';
import { buildStartDate } from '../utils/availabilityUtils';
import { useOutingScheduling } from './useOutingScheduling';

/** Live recap + the organizer's « Choisir ce jour » action (with confirmation if answers are missing). */
export const useAvailabilityRecap = (outingId: string, onPlanned: () => void) => {
  const { user } = useAuth();
  const scheduling = useOutingScheduling(outingId);
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const [pendingChoice, setPendingChoice] = useState<DayRecap | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isOrganizer = !!user?.id && scheduling.outing?.created_by === user.id;

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
      toast.success('La sortie est planifiée.', { title: updated.title });
      onPlanned();
    } else {
      toast.error('Impossible de planifier la sortie.', { title: 'Erreur' });
    }
  };

  /** Asks « continuer sans tout le monde ? » while some invitees have not answered. */
  const chooseDay = (recap: DayRecap) => {
    if (scheduling.pendingCount > 0) setPendingChoice(recap);
    else void confirmDay(recap);
  };

  return {
    ...scheduling,
    isOrganizer,
    isSaving,
    pendingChoice,
    chooseDay,
    confirmPendingChoice: () => (pendingChoice ? confirmDay(pendingChoice) : undefined),
    cancelPendingChoice: () => setPendingChoice(null),
  };
};
