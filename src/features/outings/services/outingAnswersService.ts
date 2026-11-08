import { supabase } from '@/shared/lib/supabase';
import { MemberAnswers, OutingAnswers } from '../types/questions';
import { answersToColumns, rowToMemberAnswers } from '../utils/answersUtils';

const UNIQUE_VIOLATION = '23505';

/** Users who may answer: accepted or "maybe" participants. */
const ATTENDING_STATUSES = ['accepted', 'maybe'] as const;

export const outingAnswersService = {
  /** Ids of the participants expected to answer (accepted or "maybe"). */
  fetchAttendingUserIds: async (outingId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('outing_participants')
      .select('user_id')
      .eq('outing_id', outingId)
      .in('status', [...ATTENDING_STATUSES]);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.user_id);
  },

  /** Answers of every member of the outing (RLS limits it to members). */
  fetchAnswers: async (outingId: string): Promise<MemberAnswers[]> => {
    const { data, error } = await supabase
      .from('outing_answers')
      .select('*')
      .eq('outing_id', outingId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToMemberAnswers);
  },

  /**
   * Saves the current user's answers: updates the existing row, else inserts it.
   * (An `upsert` would try to rewrite `outing_id` / `user_id`, which are not updatable.)
   * A concurrent save that inserted first (unique violation) is resolved by updating again.
   */
  saveMyAnswers: async (outingId: string, userId: string, answers: OutingAnswers): Promise<void> => {
    const columns = answersToColumns(answers);
    const updateExisting = async (): Promise<number> => {
      const { data, error } = await supabase
        .from('outing_answers')
        .update({ ...columns, updated_at: new Date().toISOString() })
        .eq('outing_id', outingId)
        .eq('user_id', userId)
        .select('id');
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    };

    if ((await updateExisting()) > 0) return;

    const { error: insertError } = await supabase
      .from('outing_answers')
      .insert({ ...columns, outing_id: outingId, user_id: userId });
    if (!insertError) return;
    if (insertError.code === UNIQUE_VIOLATION && (await updateExisting()) > 0) return;
    throw new Error(insertError.message);
  },
};
