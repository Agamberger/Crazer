import { create } from 'zustand';
import { supabase } from '@/shared/lib/supabase';
import {
  OutingRow,
  OutingUpdate,
  PlannedOutingInsert,
  PlannedOutingRow,
  PlannedOutingUpdate,
} from '@/shared/types';
import { outingService } from '../services/outingService';

interface OutingsState {
  outings: OutingRow[];
  selectedOutingId: string | null;
  isLoading: boolean;
  error: string | null;

  // Planned Outings state
  plannedOutings: PlannedOutingRow[];
  selectedPlannedOutingId: string | null;
  isLoadingPlannedOutings: boolean;

  fetchOutings: () => Promise<OutingRow[]>;
  fetchOutingById: (id: string) => Promise<OutingRow | null>;
  createOuting: (userId: string) => Promise<OutingRow>;
  updateOuting: (id: string, updates: OutingUpdate) => Promise<OutingRow | null>;
  deleteOuting: (id: string) => Promise<boolean>;
  setSelectedOutingId: (id: string | null) => void;
  selectOuting: (id: string | null) => void;

  // Planned Outings actions
  fetchPlannedOutings: (outingId: string) => Promise<PlannedOutingRow[]>;
  createPlannedOuting: (
    outingId: string,
    userIdOrStep?: string | Partial<PlannedOutingInsert>
  ) => Promise<PlannedOutingRow>;
  addPlannedOuting: (payload: PlannedOutingInsert) => Promise<PlannedOutingRow>;
  updatePlannedOuting: (
    id: string,
    updates: PlannedOutingUpdate
  ) => Promise<PlannedOutingRow | null>;
  deletePlannedOuting: (id: string) => Promise<boolean>;
  setSelectedPlannedOutingId: (id: string | null) => void;
  selectPlannedOuting: (id: string | null) => void;
}

export const useOutingsStore = create<OutingsState>((set, get) => ({
  outings: [],
  selectedOutingId: null,
  isLoading: false,
  error: null,

  plannedOutings: [],
  selectedPlannedOutingId: null,
  isLoadingPlannedOutings: false,

  fetchOutings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await outingService.fetchMyOutings();
      set({ outings: data, isLoading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des sorties';
      set({ error: message, isLoading: false });
      return [];
    }
  },

  fetchOutingById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const outing = await outingService.getOutingById(id);
      if (outing) {
        set((state) => ({
          outings: state.outings.some((o) => o.id === id)
            ? state.outings.map((o) => (o.id === id ? outing : o))
            : [outing, ...state.outings],
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
      return outing;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la sortie';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  createOuting: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const newOuting = await outingService.createOuting({
        title: 'Nouvelle sortie',
        created_by: userId,
        status: 'draft',
        start_date: new Date().toISOString(),
      });
      set((state) => ({
        outings: [newOuting, ...state.outings],
        selectedOutingId: newOuting.id,
        isLoading: false,
      }));
      return newOuting;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la sortie';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updateOuting: async (id: string, updates: OutingUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await outingService.updateOuting(id, updates);
      set((state) => ({
        outings: state.outings.map((o) => (o.id === id ? updated : o)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la modification de la sortie';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  deleteOuting: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('outings').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({
        outings: state.outings.filter((o) => o.id !== id),
        selectedOutingId: state.selectedOutingId === id ? null : state.selectedOutingId,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression de la sortie';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  setSelectedOutingId: (id: string | null) => {
    set({ selectedOutingId: id, selectedPlannedOutingId: null });
    if (id) {
      get().fetchPlannedOutings(id);
    } else {
      set({ plannedOutings: [] });
    }
  },

  selectOuting: (id: string | null) => {
    get().setSelectedOutingId(id);
  },

  // ── Planned Outings Actions ──────────────────────────────────────────────────
  fetchPlannedOutings: async (outingId: string) => {
    set({ isLoadingPlannedOutings: true });
    try {
      const steps = await outingService.fetchPlannedOutings(outingId);
      set({ plannedOutings: steps, isLoadingPlannedOutings: false });
      return steps;
    } catch (err) {
      set({ isLoadingPlannedOutings: false });
      return [];
    }
  },

  createPlannedOuting: async (
    outingId: string,
    userIdOrStep?: string | Partial<PlannedOutingInsert>
  ) => {
    set({ isLoadingPlannedOutings: true });
    try {
      let payload: PlannedOutingInsert;
      const currentSteps = get().plannedOutings;
      const parentOuting = get().outings.find((o) => o.id === outingId);

      let scheduledFor = parentOuting?.start_date || new Date().toISOString();

      if (currentSteps.length > 0) {
        const lastStep = currentSteps[currentSteps.length - 1];
        const lastDate = new Date(lastStep.scheduled_for);
        const durationMin = lastStep.duration_min || 60;
        lastDate.setMinutes(lastDate.getMinutes() + durationMin);
        scheduledFor = lastDate.toISOString();
      }

      let createdBy: string | undefined;
      if (typeof userIdOrStep === 'string') {
        createdBy = userIdOrStep;
      } else if (userIdOrStep?.created_by) {
        createdBy = userIdOrStep.created_by;
      }

      if (!createdBy) {
        const { data } = await supabase.auth.getUser();
        createdBy = data?.user?.id || parentOuting?.created_by;
      }

      if (typeof userIdOrStep === 'string' || userIdOrStep === undefined) {
        payload = {
          outing_id: outingId,
          title: `Étape ${currentSteps.length + 1}`,
          scheduled_for: scheduledFor,
          duration_min: 60,
          status: 'pending',
          created_by: createdBy,
        };
      } else {
        payload = {
          outing_id: outingId,
          title: userIdOrStep.title || `Étape ${currentSteps.length + 1}`,
          scheduled_for: userIdOrStep.scheduled_for || scheduledFor,
          duration_min: userIdOrStep.duration_min ?? 60,
          status: userIdOrStep.status || 'pending',
          place_id: userIdOrStep.place_id || null,
          description: userIdOrStep.description || null,
          notes: userIdOrStep.notes || null,
          created_by: createdBy,
        };
      }

      const newPlanned = await outingService.createPlannedOuting(payload);
      set((state) => ({
        plannedOutings: [...state.plannedOutings, newPlanned],
        selectedPlannedOutingId: newPlanned.id,
        isLoadingPlannedOutings: false,
      }));
      return newPlanned;
    } catch (err) {
      set({ isLoadingPlannedOutings: false });
      throw err;
    }
  },

  addPlannedOuting: async (payload: PlannedOutingInsert) => {
    set({ isLoadingPlannedOutings: true });
    try {
      let finalPayload = payload;
      if (!finalPayload.created_by) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          finalPayload = { ...payload, created_by: data.user.id };
        }
      }
      const newPlanned = await outingService.createPlannedOuting(finalPayload);
      set((state) => ({
        plannedOutings: [...state.plannedOutings, newPlanned],
        isLoadingPlannedOutings: false,
      }));
      return newPlanned;
    } catch (err) {
      set({ isLoadingPlannedOutings: false });
      throw err;
    }
  },

  updatePlannedOuting: async (id: string, updates: PlannedOutingUpdate) => {
    set({ isLoadingPlannedOutings: true });
    try {
      const updated = await outingService.updatePlannedOuting(id, updates);
      set((state) => ({
        plannedOutings: state.plannedOutings.map((p) => (p.id === id ? updated : p)),
        isLoadingPlannedOutings: false,
      }));
      return updated;
    } catch (err) {
      set({ isLoadingPlannedOutings: false });
      return null;
    }
  },

  deletePlannedOuting: async (id: string) => {
    set({ isLoadingPlannedOutings: true });
    try {
      await outingService.deletePlannedOuting(id);
      set((state) => ({
        plannedOutings: state.plannedOutings.filter((p) => p.id !== id),
        selectedPlannedOutingId: state.selectedPlannedOutingId === id ? null : state.selectedPlannedOutingId,
        isLoadingPlannedOutings: false,
      }));
      return true;
    } catch (err) {
      set({ isLoadingPlannedOutings: false });
      return false;
    }
  },

  setSelectedPlannedOutingId: (id: string | null) => {
    set({ selectedPlannedOutingId: id });
  },

  selectPlannedOuting: (id: string | null) => {
    get().setSelectedPlannedOutingId(id);
  },
}));
