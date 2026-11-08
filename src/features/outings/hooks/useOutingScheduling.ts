import { useCallback, useEffect, useMemo } from 'react';
import { OutingRow } from '@/shared/types';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DayRecap, OutingScheduling } from '../types/scheduling';
import { computeDayRecaps, countPendingResponses } from '../utils/availabilityUtils';

export interface UseOutingSchedulingResult {
  outing: OutingRow | null;
  scheduling: OutingScheduling | null;
  recaps: DayRecap[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Loads an outing's days, availabilities and members, and keeps them live
 * through a realtime subscription while the screen is mounted.
 */
export const useOutingScheduling = (outingId: string | undefined): UseOutingSchedulingResult => {
  const outing = useOutingsStore(
    (state) => state.outings.find((o) => o.id === outingId) ?? null,
  );
  const fetchOutingById = useOutingsStore((state) => state.fetchOutingById);
  const scheduling = useOutingSchedulingStore((state) =>
    outingId ? (state.schedulingByOutingId[outingId] ?? null) : null,
  );
  const fetchScheduling = useOutingSchedulingStore((state) => state.fetchScheduling);
  const isLoading = useOutingSchedulingStore((state) => state.isLoadingScheduling);
  const error = useOutingSchedulingStore((state) => state.error);

  const organizerId = outing?.created_by;

  useEffect(() => {
    if (outingId && !outing) void fetchOutingById(outingId);
  }, [outingId, outing, fetchOutingById]);

  const refresh = useCallback(async () => {
    if (!outingId || !organizerId) return;
    await fetchScheduling({ id: outingId, created_by: organizerId });
  }, [outingId, organizerId, fetchScheduling]);

  useEffect(() => {
    if (!outingId || !organizerId) return undefined;
    void refresh();
    return outingSchedulingService.subscribeToOutingScheduling(outingId, () => {
      void refresh();
    });
  }, [outingId, organizerId, refresh]);

  const recaps = useMemo(
    () =>
      scheduling
        ? computeDayRecaps(scheduling.days, scheduling.availabilities, scheduling.members)
        : [],
    [scheduling],
  );
  const pendingCount = useMemo(
    () => (scheduling ? countPendingResponses(scheduling.members) : 0),
    [scheduling],
  );

  return { outing, scheduling, recaps, pendingCount, isLoading, error, refresh };
};
