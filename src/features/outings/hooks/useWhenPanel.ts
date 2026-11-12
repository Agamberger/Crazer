import { useEffect, useMemo, useRef, useState } from 'react';
import { TimeRange } from '@/shared/components';
import { OutingRow } from '@/shared/types';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { PanelFeedback } from '../types/hub';
import { DayKey, OutingScheduling } from '../types/scheduling';
import {
  attendingMembers,
  DEFAULT_TIME_RANGE,
  haveSameDays,
  haveSameSlots,
  memberSlotsByDay,
  slotsToPayload,
} from '../utils/availabilityUtils';
import { useDayChoice, UseDayChoiceResult } from './useDayChoice';

export interface UseWhenPanelParams {
  visible: boolean;
  outing: OutingRow;
  scheduling: OutingScheduling | null;
  userId: string | null;
  isOrganizer: boolean;
  pendingCount: number;
}

export interface UseWhenPanelResult {
  /** Candidate days shown: the organizer's draft, the saved days for the others. */
  days: DayKey[];
  /** The organizer edits the days while no day is chosen. */
  canEditDays: boolean;
  setDays: (days: DayKey[]) => void;
  /** Organizer and members who said yes or « peut-être » give their slots. */
  canGiveSlots: boolean;
  mySlots: Record<DayKey, TimeRange>;
  setAvailable: (day: DayKey, available: boolean) => void;
  setSlot: (day: DayKey, range: TimeRange) => void;
  canSave: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
  feedback: PanelFeedback | null;
  dayChoice: UseDayChoiceResult;
  /** Removes the chosen date (organizer), so that the days can be changed again. */
  clearDay: () => Promise<void>;
}

const areRangesValid = (slots: Record<DayKey, TimeRange>): boolean =>
  Object.values(slots).every((range) => range.end > range.start);

/**
 * State of the « Quand ? » panel: candidate days (organizer), my slots per day and the choice
 * of the day. Drafts are reset from the saved data each time the panel opens.
 */
export const useWhenPanel = ({
  visible,
  outing,
  scheduling,
  userId,
  isOrganizer,
  pendingCount,
}: UseWhenPanelParams): UseWhenPanelResult => {
  const saveDays = useOutingSchedulingStore((state) => state.saveDays);
  const saveMySlots = useOutingSchedulingStore((state) => state.saveMySlots);
  const isSaving = useOutingSchedulingStore((state) => state.isSubmitting);
  const [feedback, setFeedback] = useState<PanelFeedback | null>(null);

  const savedDays = useMemo(() => scheduling?.days ?? [], [scheduling]);
  const savedSlots = useMemo(
    () => (scheduling && userId ? memberSlotsByDay(scheduling.availabilities, userId) : {}),
    [scheduling, userId],
  );
  const [draftDays, setDraftDays] = useState<DayKey[]>(savedDays);
  const [draftSlots, setDraftSlots] = useState<Record<DayKey, TimeRange>>(savedSlots);

  const wasVisible = useRef(visible);
  useEffect(() => {
    const isOpening = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!isOpening) return;
    setDraftDays(savedDays);
    setDraftSlots(savedSlots);
    setFeedback(null);
  }, [visible, savedDays, savedSlots]);

  const dayChoice = useDayChoice(
    outing.id,
    pendingCount,
    () => setFeedback({ tone: 'success', message: 'La sortie est planifiée.' }),
    false,
  );

  const canEditDays = isOrganizer && !outing.start_date;
  const days = canEditDays ? draftDays : savedDays;
  const canGiveSlots =
    isOrganizer ||
    attendingMembers(scheduling?.members ?? []).some((member) => member.userId === userId);

  const daysChanged = canEditDays && !haveSameDays(draftDays, savedDays);
  const slotsChanged = canGiveSlots && !haveSameSlots(draftSlots, savedSlots);

  /** A day the organizer adds is a day they are available, with the default slot (editable). */
  const setDays = (next: DayKey[]) => {
    setFeedback(null);
    const sorted = [...next].sort();
    const added = sorted.filter((day) => !draftDays.includes(day));
    setDraftDays(sorted);
    setDraftSlots((current) => ({
      ...Object.fromEntries(Object.entries(current).filter(([day]) => sorted.includes(day))),
      ...Object.fromEntries(added.map((day) => [day, DEFAULT_TIME_RANGE])),
    }));
  };

  const setAvailable = (day: DayKey, available: boolean) => {
    setFeedback(null);
    setDraftSlots((current) => {
      const { [day]: removed, ...others } = current;
      return available ? { ...others, [day]: removed ?? DEFAULT_TIME_RANGE } : others;
    });
  };

  const setSlot = (day: DayKey, range: TimeRange) => {
    setFeedback(null);
    setDraftSlots((current) => ({ ...current, [day]: range }));
  };

  const save = async () => {
    try {
      if (daysChanged) await saveDays(outing, draftDays);
      if (slotsChanged || daysChanged) {
        await saveMySlots(outing, slotsToPayload(days, draftSlots));
      }
      setFeedback({ tone: 'success', message: 'C’est enregistré.' });
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Impossible d’enregistrer. Réessaie dans un instant.',
      });
    }
  };

  const clearDay = async () => {
    const cleared = await dayChoice.clearDay();
    setFeedback(
      cleared
        ? { tone: 'success', message: 'La date est retirée : tu peux changer les jours.' }
        : { tone: 'error', message: 'Impossible de retirer la date.' },
    );
  };

  return {
    days,
    canEditDays,
    setDays,
    canGiveSlots,
    mySlots: draftSlots,
    setAvailable,
    setSlot,
    canSave: (daysChanged || slotsChanged) && areRangesValid(draftSlots) && !isSaving,
    isSaving,
    save,
    feedback,
    dayChoice,
    clearDay,
  };
};
