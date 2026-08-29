import { create } from 'zustand';
import { supabase } from '@/shared/lib/supabase';
import { OutingRow, OutingUpdate } from '@/shared/types';
import { outingService } from '../services/outingService';

interface OutingsState {
  outings: OutingRow[];
  selectedOutingId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchOutings: () => Promise<void>;
  fetchOutingById: (id: string) => Promise<OutingRow | null>;
  createOuting: (userId?: string) => Promise<OutingRow | null>;
  updateOuting: (id: string, updates: OutingUpdate) => Promise<OutingRow | null>;
  selectOuting: (id: string | null) => void;
}

export const useOutingsStore = create<OutingsState>((set, get) => ({
  outings: [],
  selectedOutingId: null,
  isLoading: false,
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

      // Date par défaut : demain à la même heure
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

  selectOuting: (id) => set({ selectedOutingId: id }),
}));
