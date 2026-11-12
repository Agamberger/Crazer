import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { ActivityVote, OutingRow } from '@/shared/types';
import { activityVotesService } from '../services/activityVotesService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { ActivityGroup, OutingActivities } from '../types/activities';
import { DayKey, OutingMember } from '../types/scheduling';
import { computeActivityGroups, nextVote } from '../utils/activityUtils';
import { useOutingMembers } from './useOutingMembers';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';

const NO_ACTIVITIES: OutingActivities = { activities: [], votes: [] };
const NO_DAYS: DayKey[] = [];

export interface ProposeActivityInput {
  day: DayKey | null;
  title: string;
  note: string;
  placeId: string | null;
}

export interface UseActivityVotesResult {
  outing: OutingRow | null;
  groups: ActivityGroup[];
  days: DayKey[];
  members: OutingMember[];
  isOrganizer: boolean;
  /** Organizer, accepted or "maybe" participants can propose and vote. */
  canVote: boolean;
  isReady: boolean;
  isSaving: boolean;
  loadFailed: boolean;
  propose: (input: ProposeActivityInput) => Promise<boolean>;
  toggleVote: (activityId: string, tapped: ActivityVote) => Promise<void>;
  choose: (activityId: string) => Promise<void>;
  reopen: (day: DayKey | null) => Promise<void>;
  remove: (activityId: string) => Promise<void>;
}

const showError = (message: string) => toast.error(message, { title: 'Erreur' });

/**
 * Loads an outing's activities and votes and keeps them live through a realtime
 * subscription while the screen is mounted.
 */
export const useActivityVotes = (outingId: string | undefined): UseActivityVotesResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const outing = useOutingsStore((state) => state.outings.find((o) => o.id === outingId) ?? null);
  const fetchOutingById = useOutingsStore((state) => state.fetchOutingById);
  const members = useOutingMembers(outing);
  const days = useOutingSchedulingStore((state) =>
    outingId ? (state.schedulingByOutingId[outingId]?.days ?? NO_DAYS) : NO_DAYS,
  );
  const data = useActivityVotesStore((state) =>
    outingId ? state.activitiesByOutingId[outingId] : undefined,
  );
  const isSaving = useActivityVotesStore((state) => state.isSaving);
  const error = useActivityVotesStore((state) => state.error);
  const store = useActivityVotesStore.getState;

  const isOrganizer = !!userId && outing?.created_by === userId;
  const myStatus = members.find((m) => m.userId === userId)?.status;
  const canVote = isOrganizer || myStatus === 'accepted' || myStatus === 'maybe';

  useEffect(() => {
    if (outingId && !outing) void fetchOutingById(outingId);
  }, [outingId, outing, fetchOutingById]);

  useEffect(() => {
    if (!outingId) return undefined;
    void store().fetchActivities(outingId);
    return activityVotesService.subscribeToActivities(outingId, () => {
      void store().fetchActivities(outingId);
    });
  }, [outingId, store]);

  const groups = useMemo(() => {
    const { activities, votes } = data ?? NO_ACTIVITIES;
    return computeActivityGroups(days, activities, votes, userId);
  }, [data, days, userId]);

  /** Runs a store action and reports a failure with a toast. */
  const attempt = useCallback(
    async (action: () => Promise<unknown>, failure: string): Promise<boolean> => {
      try {
        await action();
        return true;
      } catch {
        showError(failure);
        return false;
      }
    },
    [],
  );

  const propose = useCallback(
    async (input: ProposeActivityInput) => {
      if (!outingId || !userId) return false;
      return attempt(
        () =>
          store().proposeActivity({
            outingId,
            userId,
            day: input.day,
            title: input.title,
            note: input.note,
            placeId: input.placeId,
          }),
        'Impossible de proposer cette activité.',
      );
    },
    [outingId, userId, attempt, store],
  );

  const toggleVote = useCallback(
    async (activityId: string, tapped: ActivityVote) => {
      if (!outingId || !userId) return;
      const current = data?.votes.find((v) => v.activityId === activityId && v.userId === userId);
      await attempt(
        () => store().vote(outingId, activityId, userId, nextVote(current?.vote ?? null, tapped)),
        'Impossible d’enregistrer ton vote.',
      );
    },
    [outingId, userId, data, attempt, store],
  );

  const choose = useCallback(
    async (activityId: string) => {
      if (!outingId) return;
      await attempt(() => store().chooseActivity(outingId, activityId), 'Impossible de retenir cette activité.');
    },
    [outingId, attempt, store],
  );

  const reopen = useCallback(
    async (day: DayKey | null) => {
      if (!outingId) return;
      await attempt(() => store().reopenActivities(outingId, day), 'Impossible de rouvrir le vote.');
    },
    [outingId, attempt, store],
  );

  const remove = useCallback(
    async (activityId: string) => {
      if (!outingId) return;
      await attempt(() => store().deleteActivity(outingId, activityId), 'Impossible de supprimer cette activité.');
    },
    [outingId, attempt, store],
  );

  return {
    outing,
    groups,
    days,
    members,
    isOrganizer,
    canVote,
    isReady: !!outing && !!data,
    isSaving,
    loadFailed: !data && !!error,
    propose,
    toggleVote,
    choose,
    reopen,
    remove,
  };
};
