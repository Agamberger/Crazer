import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { toast } from '@/shared/store/useToastStore';
import { ActivityVote, OutingRow } from '@/shared/types';
import { activityVotesService } from '../services/activityVotesService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { ActivityResult, OutingActivities } from '../types/activities';
import { OutingMember } from '../types/scheduling';
import { nextVote, rankActivities } from '../utils/activityUtils';
import { useOutingMembers } from './useOutingMembers';

const NO_ACTIVITIES: OutingActivities = { activities: [], votes: [] };

export interface ProposeActivityInput {
  title: string;
  note: string;
  placeId: string | null;
}

export interface UseActivityVotesResult {
  outing: OutingRow | null;
  /** Activities of the pool not placed in the programme yet, best score first. */
  pool: ActivityResult[];
  members: OutingMember[];
  isOrganizer: boolean;
  /** Organizer, accepted or "maybe" participants can propose and vote. */
  canVote: boolean;
  isReady: boolean;
  isSaving: boolean;
  loadFailed: boolean;
  propose: (input: ProposeActivityInput) => Promise<boolean>;
  toggleVote: (activityId: string, tapped: ActivityVote) => Promise<void>;
  remove: (activityId: string) => Promise<void>;
}

const showError = (message: string) => toast.error(message, { title: 'Erreur' });

/**
 * Loads an outing's activity pool and votes and keeps them live through a realtime
 * subscription while the screen is mounted. Activities placed in the programme (a step of the
 * outing links them) leave the pool.
 */
export const useActivityVotes = (outingId: string | undefined): UseActivityVotesResult => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const outing = useOutingsStore((state) => state.outings.find((o) => o.id === outingId) ?? null);
  const fetchOutingById = useOutingsStore((state) => state.fetchOutingById);
  const members = useOutingMembers(outing);
  const steps = useOutingsStore((state) => state.plannedOutings);
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

  const pool = useMemo(() => {
    const { activities, votes } = data ?? NO_ACTIVITIES;
    const placedIds = new Set(
      steps
        .filter((step) => step.outing_id === outingId && step.status !== 'cancelled')
        .map((step) => step.activity_id),
    );
    return rankActivities(
      activities.filter((activity) => !placedIds.has(activity.id)),
      votes,
      userId,
    );
  }, [data, steps, outingId, userId]);

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

  const remove = useCallback(
    async (activityId: string) => {
      if (!outingId) return;
      await attempt(() => store().deleteActivity(outingId, activityId), 'Impossible de supprimer cette activité.');
    },
    [outingId, attempt, store],
  );

  return {
    outing,
    pool,
    members,
    isOrganizer,
    canVote,
    isReady: !!outing && !!data,
    isSaving,
    loadFailed: !data && !!error,
    propose,
    toggleVote,
    remove,
  };
};
