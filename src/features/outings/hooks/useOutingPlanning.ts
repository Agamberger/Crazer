import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimeRange } from '@/shared/components';
import { useAuth } from '@/features/auth';
import { useDebouncedCallback } from '@/shared/hooks/useDebouncedCallback';
import { toast } from '@/shared/store/useToastStore';
import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { outingPlanningService } from '../services/outingPlanningService';
import { useOutingPlanningStore } from '../store/useOutingPlanningStore';
import { DayPlanning, MoveDirection, PlanningChanges } from '../types/planning';
import { DayKey, OutingMember } from '../types/scheduling';
import { attendingMembers } from '../utils/availabilityUtils';
import {
  appendActivity,
  buildDayPlanning,
  changeStepDuration,
  defaultPlanningDay,
  DEFAULT_TRAVEL_MIN,
  moveStep,
  planningDays,
  suggestPlanning,
} from '../utils/planningUtils';
import { useOutingScheduling } from './useOutingScheduling';

export interface UseOutingPlanningResult {
  outing: OutingRow | null;
  days: DayKey[];
  selectedDay: DayKey | null;
  selectDay: (day: DayKey) => void;
  planning: DayPlanning | null;
  members: OutingMember[];
  travelMin: number;
  setTravelMin: (minutes: number) => void;
  isOrganizer: boolean;
  /** Attendees (organizer, accepted, « peut-être ») can change their own slot of a candidate day. */
  canSetMyAvailability: boolean;
  /** The current user's slot on the selected day, `null` when they gave none. */
  mySlot: TimeRange | null;
  isReady: boolean;
  isSaving: boolean;
  loadFailed: boolean;
  suggest: () => Promise<void>;
  move: (stepId: string, direction: MoveDirection) => Promise<void>;
  setDuration: (stepId: string, durationMin: number) => Promise<void>;
  place: (activityId: string) => Promise<void>;
  saveMyAvailability: (range: TimeRange) => Promise<boolean>;
}

const NO_STEPS: PlannedOutingRow[] = [];

/**
 * Planning of an outing's day: steps, retained activities and everyone's
 * availability, all kept live through realtime subscriptions.
 */
export const useOutingPlanning = (outingId: string | undefined): UseOutingPlanningResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { outing, scheduling, error: schedulingError } = useOutingScheduling(outingId);
  const steps = useOutingPlanningStore((state) =>
    outingId ? state.stepsByOutingId[outingId] : undefined,
  );
  const isSaving = useOutingPlanningStore((state) => state.isSaving);
  const planningError = useOutingPlanningStore((state) => state.error);
  const activities = useOutingPlanningStore((state) =>
    outingId ? state.activitiesByOutingId[outingId] : undefined,
  );
  const [pickedDay, setPickedDay] = useState<DayKey | null>(null);
  const [travelMin, setTravelMin] = useState(DEFAULT_TRAVEL_MIN);

  const reload = useCallback(() => {
    if (!outingId) return;
    const planningStore = useOutingPlanningStore.getState();
    void planningStore.fetchSteps(outingId);
    void planningStore.fetchActivities(outingId);
  }, [outingId]);
  const { run: reloadSoon } = useDebouncedCallback(reload);

  useEffect(() => {
    if (!outingId) return undefined;
    reload();
    return outingPlanningService.subscribeToPlanning(outingId, reloadSoon);
  }, [outingId, reload, reloadSoon]);

  const members = useMemo(() => scheduling?.members ?? [], [scheduling]);
  const days = useMemo(
    () => planningDays(scheduling?.days ?? [], steps ?? NO_STEPS),
    [scheduling, steps],
  );
  const selectedDay =
    pickedDay && days.includes(pickedDay)
      ? pickedDay
      : defaultPlanningDay(days, outing?.start_date ?? null);

  const planning = useMemo(() => {
    if (!selectedDay || !scheduling || !steps) return null;
    return buildDayPlanning(
      selectedDay,
      steps,
      activities ?? [],
      scheduling.availabilities,
      scheduling.members,
    );
  }, [selectedDay, scheduling, steps, activities]);

  const isOrganizer = !!userId && outing?.created_by === userId;
  const canSetMyAvailability =
    !!userId &&
    !!selectedDay &&
    !!scheduling?.days.includes(selectedDay) &&
    attendingMembers(members).some((m) => m.userId === userId);
  const mySlot = useMemo(() => {
    const slot = scheduling?.availabilities.find(
      (a) => a.userId === userId && a.day === selectedDay,
    );
    return slot ? { start: slot.start, end: slot.end } : null;
  }, [scheduling, userId, selectedDay]);

  const apply = useCallback(
    async (changes: PlanningChanges | null, failure: string) => {
      if (!outingId || !changes) return;
      try {
        await useOutingPlanningStore.getState().applyChanges(outingId, changes);
      } catch {
        toast.error(failure, { title: 'Erreur' });
      }
    },
    [outingId],
  );

  const suggest = useCallback(async () => {
    if (!planning) return;
    await apply(suggestPlanning(planning, travelMin), 'Impossible d’appliquer la suggestion.');
  }, [planning, travelMin, apply]);

  const move = useCallback(
    async (stepId: string, direction: MoveDirection) => {
      if (!planning) return;
      await apply(moveStep(planning, stepId, direction, travelMin), 'Impossible de déplacer l’étape.');
    },
    [planning, travelMin, apply],
  );

  const setDuration = useCallback(
    async (stepId: string, durationMin: number) => {
      if (!planning) return;
      await apply(
        changeStepDuration(planning, stepId, durationMin, travelMin),
        'Impossible de modifier la durée.',
      );
    },
    [planning, travelMin, apply],
  );

  const place = useCallback(
    async (activityId: string) => {
      if (!planning) return;
      await apply(
        { reschedule: [], placements: [appendActivity(planning, activityId, travelMin)] },
        'Impossible de placer cette activité.',
      );
    },
    [planning, travelMin, apply],
  );

  const saveMyAvailability = useCallback(
    async (range: TimeRange) => {
      if (!outingId || !selectedDay) return false;
      try {
        await useOutingPlanningStore.getState().setMyAvailability(outingId, selectedDay, range);
        toast.success('Tes horaires sont enregistrés.');
        return true;
      } catch {
        toast.error('Impossible d’enregistrer tes horaires.', { title: 'Erreur' });
        return false;
      }
    },
    [outingId, selectedDay],
  );

  return {
    outing,
    days,
    selectedDay,
    selectDay: setPickedDay,
    planning,
    members,
    travelMin,
    setTravelMin,
    isOrganizer,
    canSetMyAvailability,
    mySlot,
    isReady: !!outing && !!scheduling && !!steps,
    isSaving,
    loadFailed: (!steps && !!planningError) || (!scheduling && !!schedulingError),
    suggest,
    move,
    setDuration,
    place,
    saveMyAvailability,
  };
};
