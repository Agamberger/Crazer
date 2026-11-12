import { create } from 'zustand';
import { TimeRange } from '@/shared/components';
import { bindSetToSession, registerUserScopedStore } from '@/shared/store/sessionReset';
import { PlannedOutingRow } from '@/shared/types';
import { activityVotesService } from '../services/activityVotesService';
import { outingPlanningService } from '../services/outingPlanningService';
import { outingService } from '../services/outingService';
import { OutingActivity } from '../types/activities';
import { PlanningChanges } from '../types/planning';
import { DayKey } from '../types/scheduling';
import { useOutingSchedulingStore } from './useOutingSchedulingStore';
import { useOutingsStore } from './useOutingsStore';

interface OutingPlanningState {
  stepsByOutingId: Record<string, PlannedOutingRow[]>;
  /** Activities of the outing (without the votes, which the planning does not use). */
  activitiesByOutingId: Record<string, OutingActivity[]>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  /** Loads the outing's steps; returns `null` when the loading failed. */
  fetchSteps: (outingId: string) => Promise<PlannedOutingRow[] | null>;
  /** Loads the outing's activities; returns `null` when the loading failed. */
  fetchActivities: (outingId: string) => Promise<OutingActivity[] | null>;
  /** Organizer only: saves new times and places activities in one transaction. Throws on failure. */
  applyChanges: (outingId: string, changes: PlanningChanges) => Promise<void>;
  /** Replaces the user's slot of one day (late arrival). Throws on failure. */
  setMyAvailability: (outingId: string, day: DayKey, range: TimeRange) => Promise<void>;
}

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/** Keeps the Sorties tab timeline and the outing (start date) in sync after a change. */
const refreshOutingViews = async (outingId: string): Promise<void> => {
  const outings = useOutingsStore.getState();
  await outings.fetchOutingById(outingId);
  if (outings.selectedOutingId === outingId) await outings.fetchPlannedOutings(outingId);
};

export const useOutingPlanningStore = create<OutingPlanningState>((set, get) => ({
  stepsByOutingId: {},
  activitiesByOutingId: {},
  isLoading: false,
  isSaving: false,
  error: null,

  fetchSteps: async (outingId) => {
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const steps = await outingService.fetchPlannedOutings(outingId);
      setLive((state) => ({
        stepsByOutingId: { ...state.stepsByOutingId, [outingId]: steps },
        isLoading: false,
      }));
      return steps;
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, 'Erreur lors du chargement du planning'), isLoading: false });
      return null;
    }
  },

  fetchActivities: async (outingId) => {
    const setLive = bindSetToSession(set);
    try {
      const activities = await activityVotesService.fetchActivities(outingId);
      setLive((state) => ({
        activitiesByOutingId: { ...state.activitiesByOutingId, [outingId]: activities },
      }));
      return activities;
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, 'Erreur lors du chargement des activités') });
      return null;
    }
  },

  applyChanges: async (outingId, changes) => {
    const setLive = bindSetToSession(set);
    setLive({ isSaving: true, error: null });
    try {
      await outingPlanningService.applyPlanning(outingId, changes);
      await get().fetchSteps(outingId);
      await refreshOutingViews(outingId);
      setLive({ isSaving: false });
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, 'Erreur lors de la mise à jour du planning'), isSaving: false });
      throw err;
    }
  },

  setMyAvailability: async (outingId, day, range) => {
    const setLive = bindSetToSession(set);
    setLive({ isSaving: true, error: null });
    try {
      await outingPlanningService.setMyAvailability(outingId, day, range);
      const outing = useOutingsStore.getState().outings.find((o) => o.id === outingId);
      if (outing) await useOutingSchedulingStore.getState().fetchScheduling(outing);
      setLive({ isSaving: false });
    } catch (err: unknown) {
      setLive({ error: errorMessage(err, 'Erreur lors de l’enregistrement de tes horaires'), isSaving: false });
      throw err;
    }
  },
}));

// Data of the logged-in account: cleared on logout.
registerUserScopedStore(useOutingPlanningStore);
