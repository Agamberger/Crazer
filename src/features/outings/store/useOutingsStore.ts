import { create } from 'zustand';
import { bindSetToSession, registerUserScopedStore } from '@/shared/store/sessionReset';
import { supabase } from '@/shared/lib/supabase';
import {
  OutingRow,
  OutingUpdate,
  PlannedOutingInsert,
  PlannedOutingRow,
  PlannedOutingUpdate,
} from '@/shared/types';
import { outingService } from '../services/outingService';

export interface CreatePlannedOutingOptions extends Partial<PlannedOutingInsert> {
  userId?: string;
}

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
    options?: CreatePlannedOutingOptions
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
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const data = await outingService.fetchMyOutings();
      setLive({ outings: data, isLoading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des sorties';
      setLive({ error: message, isLoading: false });
      return [];
    }
  },

  fetchOutingById: async (id: string) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const outing = await outingService.getOutingById(id);
      if (outing) {
        setLive((state) => ({
          outings: state.outings.some((o) => o.id === id)
            ? state.outings.map((o) => (o.id === id ? outing : o))
            : [outing, ...state.outings],
          isLoading: false,
        }));
      } else {
        setLive({ isLoading: false });
      }
      return outing;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la sortie';
      setLive({ error: message, isLoading: false });
      return null;
    }
  },

  createOuting: async (userId: string) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const newOuting = await outingService.createOuting({
        title: 'Nouvelle sortie',
        created_by: userId,
        status: 'draft',
        start_date: new Date().toISOString(),
      });
      setLive((state) => ({
        outings: [newOuting, ...state.outings],
        selectedOutingId: newOuting.id,
        isLoading: false,
      }));
      return newOuting;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la sortie';
      setLive({ error: message, isLoading: false });
      throw err;
    }
  },

  updateOuting: async (id: string, updates: OutingUpdate) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const updated = await outingService.updateOuting(id, updates);
      setLive((state) => ({
        outings: state.outings.map((o) => (o.id === id ? updated : o)),
        isLoading: false,
      }));
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la modification de la sortie';
      setLive({ error: message, isLoading: false });
      return null;
    }
  },

  deleteOuting: async (id: string) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      await outingService.deleteOuting(id);
      setLive((state) => ({
        outings: state.outings.filter((o) => o.id !== id),
        selectedOutingId: state.selectedOutingId === id ? null : state.selectedOutingId,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression de la sortie';
      setLive({ error: message, isLoading: false });
      return false;
    }
  },

  setSelectedOutingId: (id: string | null) => {
    set({
      selectedOutingId: id,
      selectedPlannedOutingId: null,
      ...(id === null ? { plannedOutings: [] } : {}),
    });
  },

  selectOuting: (id: string | null) => {
    get().setSelectedOutingId(id);
  },

  // --- Planned Outings Actions ---
  fetchPlannedOutings: async (outingId: string) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoadingPlannedOutings: true, error: null });
    try {
      const steps = await outingService.fetchPlannedOutings(outingId);
      // Protection contre les réponses tardives : ne pas écraser si une autre sortie a été sélectionnée entre-temps
      if (get().selectedOutingId === outingId || get().selectedOutingId === null) {
        setLive({ plannedOutings: steps, isLoadingPlannedOutings: false });
      } else {
        setLive({ isLoadingPlannedOutings: false });
      }
      return steps;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des étapes';
      setLive({ error: message, isLoadingPlannedOutings: false });
      return [];
    }
  },

  createPlannedOuting: async (
    outingId: string,
    options?: CreatePlannedOutingOptions
  ) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoadingPlannedOutings: true, error: null });
    try {
      const opts = options ?? {};
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

      let createdBy: string | undefined = opts.userId || opts.created_by;

      if (!createdBy) {
        const { data } = await supabase.auth.getUser();
        createdBy = data?.user?.id || parentOuting?.created_by;
      }

      if (!createdBy) {
        throw new Error('Utilisateur non connecté');
      }

      const payload: PlannedOutingInsert = {
        outing_id: outingId,
        title: opts.title || `Étape ${currentSteps.length + 1}`,
        scheduled_for: opts.scheduled_for || scheduledFor,
        duration_min: opts.duration_min ?? 60,
        status: opts.status || 'pending',
        place_id: opts.place_id || null,
        description: opts.description || null,
        notes: opts.notes || null,
        created_by: createdBy,
      };

      const newPlanned = await outingService.createPlannedOuting(payload);
      setLive((state) => ({
        plannedOutings: [...state.plannedOutings, newPlanned],
        selectedPlannedOutingId: newPlanned.id,
        isLoadingPlannedOutings: false,
      }));
      return newPlanned;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de l\'étape';
      setLive({ error: message, isLoadingPlannedOutings: false });
      throw err;
    }
  },

  addPlannedOuting: async (payload: PlannedOutingInsert) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoadingPlannedOutings: true, error: null });
    try {
      let finalPayload = payload;
      if (!finalPayload.created_by) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          finalPayload = { ...payload, created_by: data.user.id };
        }
      }
      const newPlanned = await outingService.createPlannedOuting(finalPayload);
      setLive((state) => ({
        plannedOutings: [...state.plannedOutings, newPlanned],
        isLoadingPlannedOutings: false,
      }));
      return newPlanned;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l\'ajout de l\'étape';
      setLive({ error: message, isLoadingPlannedOutings: false });
      throw err;
    }
  },

  updatePlannedOuting: async (id: string, updates: PlannedOutingUpdate) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoadingPlannedOutings: true, error: null });
    try {
      const updated = await outingService.updatePlannedOuting(id, updates);
      setLive((state) => ({
        plannedOutings: state.plannedOutings.map((p) => (p.id === id ? updated : p)),
        isLoadingPlannedOutings: false,
      }));
      return updated;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la modification de l\'étape';
      setLive({ error: message, isLoadingPlannedOutings: false });
      return null;
    }
  },

  deletePlannedOuting: async (id: string) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoadingPlannedOutings: true, error: null });
    try {
      await outingService.deletePlannedOuting(id);
      setLive((state) => ({
        plannedOutings: state.plannedOutings.filter((p) => p.id !== id),
        selectedPlannedOutingId: state.selectedPlannedOutingId === id ? null : state.selectedPlannedOutingId,
        isLoadingPlannedOutings: false,
      }));
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'étape';
      setLive({ error: message, isLoadingPlannedOutings: false });
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

// Données propres au compte connecté : remises à zéro à la déconnexion.
registerUserScopedStore(useOutingsStore);
