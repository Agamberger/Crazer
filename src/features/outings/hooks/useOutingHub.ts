import { useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingAnswersStore } from '../store/useOutingAnswersStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { HowSummary, WhenSummary } from '../types/hub';
import { DayRecap, OutingMember, OutingScheduling } from '../types/scheduling';
import { summarizeHow, summarizeWhen } from '../utils/hubSummaryUtils';
import { useOutingScheduling } from './useOutingScheduling';

export interface UseOutingHubResult {
  outing: OutingRow | null;
  userId: string | null;
  isOrganizer: boolean;
  scheduling: OutingScheduling | null;
  recaps: DayRecap[];
  pendingCount: number;
  members: OutingMember[];
  when: WhenSummary;
  how: HowSummary | null;
  isLoading: boolean;
  error: string | null;
  /** Renames the outing (organizer); resolves with `true` on success. */
  rename: (title: string) => Promise<boolean>;
}

/**
 * Data of the outing hub: the outing, its members and the summary of each section, kept live
 * (scheduling through realtime, answers and activities reloaded each time the hub gets focus).
 * @param outingId id of the outing shown by the hub.
 */
export const useOutingHub = (outingId: string): UseOutingHubResult => {
  const { user } = useAuth();
  const { outing, scheduling, recaps, pendingCount, isLoading, error } =
    useOutingScheduling(outingId);
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const answers = useOutingAnswersStore((state) => state.answersByOutingId[outingId]);
  const fetchAnswers = useOutingAnswersStore((state) => state.fetchAnswers);
  const activities = useActivityVotesStore((state) => state.activitiesByOutingId[outingId]);
  const fetchActivities = useActivityVotesStore((state) => state.fetchActivities);

  useFocusEffect(
    useCallback(() => {
      void fetchAnswers(outingId);
      void fetchActivities(outingId);
    }, [outingId, fetchAnswers, fetchActivities]),
  );

  const members = useMemo(() => scheduling?.members ?? [], [scheduling]);
  const when = useMemo<WhenSummary>(
    () => (outing ? summarizeWhen(outing, recaps) : { kind: 'empty' }),
    [outing, recaps],
  );
  const how = useMemo(
    () => (outing ? summarizeHow(outing, members, answers ?? [], activities ?? null) : null),
    [outing, members, answers, activities],
  );

  const rename = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!outing || !trimmed || trimmed === outing.title) return false;
      const updated = await updateOuting(outing.id, { title: trimmed });
      if (!updated) toast.error('Impossible de renommer la sortie.', { title: 'Erreur' });
      return updated !== null;
    },
    [outing, updateOuting],
  );

  return {
    outing,
    userId: user?.id ?? null,
    isOrganizer: !!user?.id && outing?.created_by === user.id,
    scheduling,
    recaps,
    pendingCount,
    members,
    when,
    how,
    isLoading: isLoading && !scheduling,
    error,
    rename,
  };
};
