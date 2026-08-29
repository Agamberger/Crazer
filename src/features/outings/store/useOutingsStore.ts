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
  selectedPlannedOutingId: string | null;
  plannedOutings: PlannedOutingRow[];
  isLoading: boolean;
  isLoadingPlannedOutings: boolean;
  error: string | null;

  fetchOutings: () => Promise<void>;
  fetchOutingById: (id: string) => Promise<OutingRow | null>;
  createOuting: (userId?: string) => Promise<OutingRow | null>;
  updateOuting: (id: string, updates: OutingUpdate) => Promise<OutingRow | null>;
  selectOuting: (id: string | null) => void;
  selectPlannedOuting: (id: string | null) => void;

  fetchPlannedOutings: (outingId: string) => Promise<PlannedOutingRow[]>;
  createPlannedOuting: (outingId: string, userId?: string) => Promise<PlannedOutingRow | null>;
  addPlannedOuting: (payload: PlannedOutingInsert) => Promise<PlannedOutingRow | null>;
  updatePlannedOuting: (id: string, updates: PlannedOutingUpdate) => Promise<PlannedOutingRow | null>;
  deletePlannedOuting: (id: string) => Promise<boolean>;
}

export const useOutingsStore = create<OutingsState>((set, get) => ({
  outings: [],
  selectedOutingId: null,
  selectedPlannedOutingId: null,
  plannedOutings: [],
  isLoading: false,
  isLoadingPlannedOutings: false,
  error: null,

  fetchOutings: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await outingService.fetchMyOutings();
      set({ outings: data, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des sorties';
      set({ error: message, isLoading: false });
    }
  },

  fetchOutingById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const outing = await outingService.getOutingById(id);
      const existing = get().outings;
      const index = existing.findIndex((o) => o.id === id);
      if (index >= 0) {
        const updatedList = [...existing];
        updatedList[index] = outing;
        set({ outings: updatedList, isLoading: false });
      } else {
        set({ outings: [outing, ...existing], isLoading: false });
      }
      return outing;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la récupération de la sortie';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  createOuting: async (userId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data } = await supabase.auth.getUser();
        targetUserId = data.user?.id;
      }

      if (!targetUserId) {
        throw new Error('Utilisateur non connecté');
      }

      // Default start date: tomorrow at the same time
      const defaultStartDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const newOuting = await outingService.createOuting({
        title: 'Nouvelle sortie',
        description: 'Sortie créée rapidement',
        start_date: defaultStartDate,
        created_by: targetUserId,
        status: 'draft',
      });

      set({
        outings: [newOuting, ...get().outings],
        selectedOutingId: newOuting.id,
        selectedPlannedOutingId: null,
        plannedOutings: [],
        isLoading: false,
      });

      return newOuting;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la sortie';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  updateOuting: async (id: string, updates: OutingUpdate) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await outingService.updateOuting(id, updates);
      set({
        outings: get().outings.map((o) => (o.id === id ? updated : o)),
        isLoading: false,
      });
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la sortie';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  selectOuting: (id) =>
    set({
      selectedOutingId: id,
      selectedPlannedOutingId: null,
      plannedOutings: id ? get().plannedOutings : [],
    }),

  selectPlannedOuting: (id) => set({ selectedPlannedOutingId: id }),

  fetchPlannedOutings: async (outingId: string) => {
    set({ isLoadingPlannedOutings: true, error: null });
    try {
      const data = await outingService.fetchPlannedOutings(outingId);
      set({ plannedOutings: data, isLoadingPlannedOutings: false });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des étapes planifiées';
      set({ error: message, isLoadingPlannedOutings: false });
      return [];
    }
  },

  createPlannedOuting: async (outingId: string, userId?: string) => {
    set({ isLoadingPlannedOutings: true, error: null });
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data } = await supabase.auth.getUser();
        targetUserId = data.user?.id;
      }

      if (!targetUserId) {
        throw new Error('Utilisateur non connecté');
      }

      const parentOuting = get().outings.find((o) => o.id === outingId);
      const currentPlanned = get().plannedOutings.filter((p) => p.outing_id === outingId);

      let nextScheduledDate: Date;
      const stepNumber = currentPlanned.length + 1;

      if (currentPlanned.length > 0) {
        const sorted = [...currentPlanned].sort(
          (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
        );
        const lastPlanned = sorted[sorted.length - 1];
        const lastDate = new Date(lastPlanned.scheduled_for);
        const durationMinutes = lastPlanned.duration_min && lastPlanned.duration_min > 0 ? lastPlanned.duration_min : 60;
        nextScheduledDate = new Date(lastDate.getTime() + durationMinutes * 60 * 1000);
      } else if (parentOuting?.start_date) {
        nextScheduledDate = new Date(parentOuting.start_date);
      } else {
        nextScheduledDate = new Date();
      }

      const payload: PlannedOutingInsert = {
        outing_id: outingId,
        created_by: targetUserId,
        title: `Étape ${stepNumber}`,
        description: null,
        scheduled_for: nextScheduledDate.toISOString(),
        duration_min: 60,
        status: 'pending',
      };

      const newPlanned = await outingService.createPlannedOuting(payload);
      const updatedList = [...get().plannedOutings, newPlanned].sort(
        (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      );

      set({
        plannedOutings: updatedList,
        isLoadingPlannedOutings: false,
      });

      return newPlanned;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de l’étape planifiée';
      set({ error: message, isLoadingPlannedOutings: false });
      return null;
    }
  },

  addPlannedOuting: async (payload: PlannedOutingInsert) => {
    set({ isLoadingPlannedOutings: true, error: null });
    try {
      const newPlanned = await outingService.createPlannedOuting(payload);
      const updatedList = [...get().plannedOutings, newPlanned].sort(
        (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
      );

      set({
        plannedOutings: updatedList,
        isLoadingPlannedOutings: false,
      });

      return newPlanned;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de l’étape planifiée';
      set({ error: message, isLoadingPlannedOutings: false });
      return null;
    }
  },

  updatePlannedOuting: async (id: string, updates: PlannedOutingUpdate) => {
    set({ isLoadingPlannedOutings: true, error: null });
    try {
      const updated = await outingService.updatePlannedOuting(id, updates);
      const updatedList = get()
        .plannedOutings.map((p) => (p.id === id ? updated : p))
        .sort(
          (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
        );

      set({
        plannedOutings: updatedList,
        isLoadingPlannedOutings: false,
      });

      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l’étape planifiée';
      set({ error: message, isLoadingPlannedOutings: false });
      return null;
    }
  },

  deletePlannedOuting: async (id: string) => {
    set({ isLoadingPlannedOutings: true, error: null });
    try {
      await outingService.deletePlannedOuting(id);
      set({
        plannedOutings: get().plannedOutings.filter((p) => p.id !== id),
        selectedPlannedOutingId:
          get().selectedPlannedOutingId === id ? null : get().selectedPlannedOutingId,
        isLoadingPlannedOutings: false,
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression de l’étape planifiée';
      set({ error: message, isLoadingPlannedOutings: false });
      return false;
    }
  },
}));
