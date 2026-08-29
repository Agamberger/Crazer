import { create } from 'zustand';
import { supabase } from '@/shared/lib/supabase';
import { OutingRow } from '@/shared/types';
import { outingService } from '../services/outingService';

interface OutingsState {
  outings: OutingRow[];
  selectedOutingId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchOutings: () => Promise<void>;
  createOuting: (userId?: string) => Promise<OutingRow | null>;
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

  selectOuting: (id) => set({ selectedOutingId: id }),
}));
