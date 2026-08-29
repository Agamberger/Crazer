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
   * Fetches outings accessible by current user.
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
   * Fetches a specific outing by its unique ID.
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
   * Creates a new outing record in Supabase.
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
   * Updates an existing outing record in Supabase.
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
   * Fetches all planned outings (steps) for a given outing,
   * sorted chronologically (scheduled_for ASC).
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
   * Creates a new planned outing (step) for an outing.
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
   * Updates an existing planned outing (step).
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
   * Deletes a planned outing (step) by its ID.
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
