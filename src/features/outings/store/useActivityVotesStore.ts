import { create } from 'zustand';
import { bindSetToSession, registerUserScopedStore } from '@/shared/store/sessionReset';
import { ActivityVote } from '@/shared/types';
import { activityVotesService, ProposeActivityPayload } from '../services/activityVotesService';
import { OutingActivities } from '../types/activities';
import { useOutingsStore } from './useOutingsStore';

interface ActivityVotesState {
  activitiesByOutingId: Record<string, OutingActivities>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  /** Loads activities and votes; returns `null` when the loading failed. */
  fetchActivities: (outingId: string) => Promise<OutingActivities | null>;
  /** Every action below throws on failure and refreshes the outing's activities on success. */
  proposeActivity: (payload: ProposeActivityPayload) => Promise<void>;
  deleteActivity: (outingId: string, activityId: string) => Promise<void>;
  /** Sets the user's vote on an activity; `null` removes it. */
  vote: (
    outingId: string,
    activityId: string,
    userId: string,
    vote: ActivityVote | null,
  ) => Promise<void>;
  /**
   * Places an activity of the pool in the programme (the database moves the overlapped steps),
   * then reloads the outing's steps. Resolves with the new step id.
   */
  placeActivity: (placement: ActivityPlacementRequest) => Promise<string>;
}

/** Where an activity of the pool is dropped in the programme. */
export interface ActivityPlacementRequest {
  outingId: string;
  activityId: string;
  scheduledFor: string;
  durationMin: number;
}

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

export const useActivityVotesStore = create<ActivityVotesState>((set, get) => {
  /** Runs a mutation, refreshes the outing's activities, and keeps the error on failure. */
  const mutate = async <T>(
    outingId: string,
    fallback: string,
    action: () => Promise<T>,
  ): Promise<T> => {
    const setLive = bindSetToSession(set);
    setLive({ isSaving: true, error: null });
    try {
      const result = await action();
      await get().fetchActivities(outingId);
      setLive({ isSaving: false });
      return result;
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, fallback), isSaving: false });
      throw err;
    }
  };

  return {
    activitiesByOutingId: {},
    isLoading: false,
    isSaving: false,
    error: null,

    fetchActivities: async (outingId) => {
      const setLive = bindSetToSession(set);
      setLive({ isLoading: true, error: null });
      try {
        const [activities, votes] = await Promise.all([
          activityVotesService.fetchActivities(outingId),
          activityVotesService.fetchVotes(outingId),
        ]);
        const loaded = { activities, votes };
        setLive((state) => ({
          activitiesByOutingId: { ...state.activitiesByOutingId, [outingId]: loaded },
          isLoading: false,
        }));
        return loaded;
      } catch (err: unknown) {
        setLive({ error: errorMessage(err, 'Erreur lors du chargement des activités'), isLoading: false });
        return null;
      }
    },

    proposeActivity: async (payload) => {
      await mutate(payload.outingId, 'Erreur lors de la proposition', async () => {
        await activityVotesService.proposeActivity(payload);
      });
    },

    deleteActivity: (outingId, activityId) =>
      mutate(outingId, 'Erreur lors de la suppression', () =>
        activityVotesService.deleteActivity(activityId),
      ),

    vote: (outingId, activityId, userId, vote) =>
      mutate(outingId, 'Erreur lors du vote', () =>
        vote === null
          ? activityVotesService.removeVote(activityId, userId)
          : activityVotesService.castVote(outingId, activityId, userId, vote),
      ),

    placeActivity: async ({ outingId, activityId, scheduledFor, durationMin }) => {
      const stepId = await mutate(outingId, 'Erreur lors de l’ajout au programme', () =>
        activityVotesService.placeActivity(activityId, scheduledFor, durationMin),
      );
      await useOutingsStore.getState().fetchPlannedOutings(outingId);
      return stepId;
    },
  };
});

// Data of the logged-in account: cleared on logout.
registerUserScopedStore(useActivityVotesStore);
