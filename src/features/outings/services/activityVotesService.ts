import { supabase } from '@/shared/lib/supabase';
import { ActivityVote, OutingActivityRow, OutingActivityVoteRow } from '@/shared/types';
import { ActivityVoteEntry, OutingActivity } from '../types/activities';
import { DayKey } from '../types/scheduling';

const UNIQUE_VIOLATION = '23505';

/** Realtime reuses a channel with the same topic, so each subscription gets a unique one. */
let subscriptionCounter = 0;

export interface ProposeActivityPayload {
  outingId: string;
  userId: string;
  day: DayKey | null;
  title: string;
  note: string | null;
  placeId: string | null;
}

const ACTIVITY_COLUMNS = '*, places(id, name, address, rating)';

type ActivityRowWithPlace = OutingActivityRow & {
  places: { id: string; name: string; address: string | null; rating: number | null } | null;
};

const rowToActivity = (row: ActivityRowWithPlace): OutingActivity => ({
  id: row.id,
  outingId: row.outing_id,
  day: row.day,
  title: row.title,
  note: row.note,
  proposedBy: row.proposed_by,
  place: row.places,
  chosen: row.chosen,
  createdAt: row.created_at,
});

const rowToVote = (row: OutingActivityVoteRow): ActivityVoteEntry => ({
  activityId: row.activity_id,
  userId: row.user_id,
  vote: row.vote,
});

export const activityVotesService = {
  fetchActivities: async (outingId: string): Promise<OutingActivity[]> => {
    const { data, error } = await supabase
      .from('outing_activities')
      .select(ACTIVITY_COLUMNS)
      .eq('outing_id', outingId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToActivity);
  },

  fetchVotes: async (outingId: string): Promise<ActivityVoteEntry[]> => {
    const { data, error } = await supabase
      .from('outing_activity_votes')
      .select('*')
      .eq('outing_id', outingId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToVote);
  },

  proposeActivity: async (payload: ProposeActivityPayload): Promise<OutingActivity> => {
    const { data, error } = await supabase
      .from('outing_activities')
      .insert({
        outing_id: payload.outingId,
        proposed_by: payload.userId,
        day: payload.day,
        title: payload.title.trim(),
        note: payload.note?.trim() || null,
        place_id: payload.placeId,
      })
      .select(ACTIVITY_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return rowToActivity(data);
  },

  deleteActivity: async (activityId: string): Promise<void> => {
    const { error } = await supabase.from('outing_activities').delete().eq('id', activityId);
    if (error) throw new Error(error.message);
  },

  /**
   * Saves the user's vote: updates the existing one, else inserts it.
   * (An `upsert` would rewrite `activity_id`, which is not updatable.)
   */
  castVote: async (
    outingId: string,
    activityId: string,
    userId: string,
    vote: ActivityVote,
  ): Promise<void> => {
    const updateExisting = async (): Promise<number> => {
      const { data, error } = await supabase
        .from('outing_activity_votes')
        .update({ vote, updated_at: new Date().toISOString() })
        .eq('activity_id', activityId)
        .eq('user_id', userId)
        .select('id');
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    };

    if ((await updateExisting()) > 0) return;

    const { error: insertError } = await supabase
      .from('outing_activity_votes')
      .insert({ outing_id: outingId, activity_id: activityId, user_id: userId, vote });
    if (!insertError) return;
    if (insertError.code === UNIQUE_VIOLATION && (await updateExisting()) > 0) return;
    throw new Error(insertError.message);
  },

  removeVote: async (activityId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('outing_activity_votes')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  /** Organizer only: retains this activity for its day. */
  chooseActivity: async (activityId: string): Promise<void> => {
    const { error } = await supabase.rpc('choose_outing_activity', { p_activity_id: activityId });
    if (error) throw new Error(error.message);
  },

  /** Organizer only: random draw among the best scored activities. Returns the winner id. */
  drawActivity: async (outingId: string, day: DayKey | null): Promise<string> => {
    const { data, error } = await supabase.rpc('draw_outing_activity', {
      p_outing_id: outingId,
      p_day: day ?? undefined,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /** Organizer only: no activity is chosen any more for this day group. */
  reopenActivities: async (outingId: string, day: DayKey | null): Promise<void> => {
    const { error } = await supabase.rpc('reopen_outing_activities', {
      p_outing_id: outingId,
      p_day: day ?? undefined,
    });
    if (error) throw new Error(error.message);
  },

  /** Live updates of activities and votes. Returns the unsubscribe function. */
  subscribeToActivities: (outingId: string, onChange: () => void): (() => void) => {
    const filter = `outing_id=eq.${outingId}`;
    subscriptionCounter += 1;
    const channel = supabase
      .channel(`outing-activities-${outingId}-${subscriptionCounter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outing_activities', filter }, onChange)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outing_activity_votes', filter },
        onChange,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
