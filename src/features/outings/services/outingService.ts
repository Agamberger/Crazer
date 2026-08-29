import { supabase } from '@/shared/lib/supabase';
import {
  OutingInsert,
  OutingRow,
  OutingUpdate,
  PlannedOutingInsert,
  PlannedOutingRow,
  PlannedOutingUpdate,
} from '@/shared/types';

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

  /**
   * Récupère toutes les étapes planifiées (planned_outings) pour une sortie,
   * triées par ordre chronologique (scheduled_for ASC).
   */
  fetchPlannedOutings: async (outingId: string): Promise<PlannedOutingRow[]> => {
    const { data, error } = await supabase
      .from('planned_outings')
      .select('*')
      .eq('outing_id', outingId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  /**
   * Crée une nouvelle étape planifiée (planned_outing) pour une sortie.
   */
  createPlannedOuting: async (payload: PlannedOutingInsert): Promise<PlannedOutingRow> => {
    const { data, error } = await supabase
      .from('planned_outings')
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Met à jour une étape planifiée existante.
   */
  updatePlannedOuting: async (
    id: string,
    updates: PlannedOutingUpdate
  ): Promise<PlannedOutingRow> => {
    const { data, error } = await supabase
      .from('planned_outings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Supprime une étape planifiée.
   */
  deletePlannedOuting: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('planned_outings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  },
};
