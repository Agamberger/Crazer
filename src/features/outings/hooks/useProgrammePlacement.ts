import { useCallback, useMemo, useState } from 'react';
import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DayKey } from '../types/scheduling';
import { defaultProgrammeStart, placementAt, sortProgrammeSteps } from '../utils/programmeUtils';

const NO_DAYS: DayKey[] = [];

export interface UseProgrammePlacementResult {
  /** Steps of the outing, in programme order (the drop positions follow this order). */
  steps: PlannedOutingRow[];
  /** Places an activity of the pool at `index` of the programme; resolves `true` on success. */
  placeAt: (activityId: string, index: number) => Promise<boolean>;
  /** Places an activity of the pool after the last step (« → Programme »). */
  placeAtEnd: (activityId: string) => Promise<boolean>;
  /** Message of the last failed placement, `null` otherwise. */
  error: string | null;
}

/**
 * Sends activities of the pool to the programme of an outing, by drag-and-drop (a position)
 * or with « → Programme » (the end).
 * @param outing the outing whose programme receives the activities.
 */
export const useProgrammePlacement = (outing: OutingRow): UseProgrammePlacementResult => {
  const allSteps = useOutingsStore((state) => state.plannedOutings);
  const days = useOutingSchedulingStore(
    (state) => state.schedulingByOutingId[outing.id]?.days ?? NO_DAYS,
  );
  const placeActivity = useActivityVotesStore((state) => state.placeActivity);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(
    () => sortProgrammeSteps(allSteps.filter((step) => step.outing_id === outing.id)),
    [allSteps, outing.id],
  );

  const placeAt = useCallback(
    async (activityId: string, index: number) => {
      setError(null);
      const placement = placementAt(steps, index, defaultProgrammeStart(outing, days, new Date()));
      try {
        await placeActivity({ outingId: outing.id, activityId, ...placement });
        return true;
      } catch {
        setError('Impossible d’ajouter cette activité au programme.');
        return false;
      }
    },
    [steps, outing, days, placeActivity],
  );

  return {
    steps,
    placeAt,
    placeAtEnd: (activityId) => placeAt(activityId, steps.length),
    error,
  };
};
