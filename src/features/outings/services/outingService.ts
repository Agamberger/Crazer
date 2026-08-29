import { supabase } from '@/shared/lib/supabase';
import { OutingInsert, OutingRow } from '@/shared/types';

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
};
