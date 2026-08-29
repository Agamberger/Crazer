import { supabase } from '@/shared/lib/supabase';
import { OutingInsert, OutingRow, OutingUpdate } from '@/shared/types';

export const outingService = {
  /**
   * Récupère la liste des sorties accessibles à l'utilisateur courant.
   */
  fetchMyOutings: async (): Promise<OutingRow[]> => {
    const { data, error } = await supabase
      .from('outings')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Récupère une sortie spécifique par son identifiant.
   */
  getOutingById: async (id: string): Promise<OutingRow> => {
    const { data, error } = await supabase
      .from('outings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Crée une nouvelle sortie dans Supabase.
   */
  createOuting: async (payload: OutingInsert): Promise<OutingRow> => {
    const { data, error } = await supabase
      .from('outings')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Met à jour une sortie existante dans Supabase.
   */
  updateOuting: async (id: string, updates: OutingUpdate): Promise<OutingRow> => {
    const { data, error } = await supabase
      .from('outings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },
};
