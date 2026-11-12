import { TimeRange } from '@/shared/components';
import { supabase } from '@/shared/lib/supabase';
import { PlanningChanges } from '../types/planning';
import { DayKey } from '../types/scheduling';

/** Realtime reuses a channel with the same topic, so each subscription gets a unique one. */
let subscriptionCounter = 0;

/** Planning of the day: placing retained activities, reordering steps, late arrivals. */
export const outingPlanningService = {
  /** Organizer only: saves new step times and places activities in one transaction. */
  applyPlanning: async (outingId: string, changes: PlanningChanges): Promise<void> => {
    const { error } = await supabase.rpc('apply_outing_planning', {
      p_outing_id: outingId,
      p_steps: changes.reschedule.map((s) => ({
        id: s.id,
        scheduled_for: s.scheduledFor,
        duration_min: s.durationMin,
      })),
      p_placements: changes.placements.map((p) => ({
        activity_id: p.activityId,
        scheduled_for: p.scheduledFor,
        duration_min: p.durationMin,
      })),
    });
    if (error) throw new Error(error.message);
  },

  /** Replaces the current user's slot for one day (late arrival / early departure). */
  setMyAvailability: async (outingId: string, day: DayKey, range: TimeRange): Promise<void> => {
    const { error } = await supabase.rpc('set_my_outing_availability', {
      p_outing_id: outingId,
      p_day: day,
      p_start: range.start,
      p_end: range.end,
    });
    if (error) throw new Error(error.message);
  },

  /** Live updates of the outing's steps and activities (not the votes). Returns the unsubscribe function. */
  subscribeToPlanning: (outingId: string, onChange: () => void): (() => void) => {
    const filter = `outing_id=eq.${outingId}`;
    subscriptionCounter += 1;
    const channel = supabase
      .channel(`outing-planning-${outingId}-${subscriptionCounter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planned_outings', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outing_activities', filter }, onChange)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
