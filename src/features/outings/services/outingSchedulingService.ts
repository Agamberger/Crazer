import { supabase } from '@/shared/lib/supabase';
import { OutingRow, ParticipantStatus } from '@/shared/types';
import {
  AvailabilitySlot,
  DayKey,
  MemberAvailability,
  OutingInvitation,
  OutingMember,
} from '../types/scheduling';
import { normalizeTime } from '../utils/availabilityUtils';

const DEFAULT_MEMBER_NAME = 'Utilisateur';

export interface CreateOutingWithInvitesPayload {
  title: string;
  startDate: string;
  days: DayKey[];
  slots: AvailabilitySlot[];
  inviteeIds: string[];
}

interface ProfileSummary {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const displayNameOf = (profile: ProfileSummary | undefined): string =>
  profile?.full_name?.trim() || profile?.email?.split('@')[0] || DEFAULT_MEMBER_NAME;

/** Profiles go through `get_profiles` (emails are column-restricted on `profiles`). */
const fetchProfiles = async (ids: string[]): Promise<Map<string, ProfileSummary>> => {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.rpc('get_profiles', { p_ids: ids });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.id, p]));
};

export const outingSchedulingService = {
  /** Creates the outing, its days, the organizer's slots and the invitations atomically. */
  createOutingWithInvites: async (payload: CreateOutingWithInvitesPayload): Promise<string> => {
    const { data, error } = await supabase.rpc('create_outing_with_invites', {
      p_title: payload.title,
      p_start_date: payload.startDate,
      p_days: payload.days,
      p_slots: payload.slots.map(({ day, start, end }) => ({ day, start, end })),
      p_invitee_ids: payload.inviteeIds,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /** Accepts (with slots) or declines an invitation. */
  respondToInvitation: async (
    outingId: string,
    status: Exclude<ParticipantStatus, 'invited'>,
    slots: AvailabilitySlot[],
  ): Promise<void> => {
    const { error } = await supabase.rpc('respond_to_outing_invitation', {
      p_outing_id: outingId,
      p_status: status,
      p_slots: slots.map(({ day, start, end }) => ({ day, start, end })),
    });
    if (error) throw new Error(error.message);
  },

  fetchOutingDays: async (outingId: string): Promise<DayKey[]> => {
    const { data, error } = await supabase
      .from('outing_days')
      .select('day')
      .eq('outing_id', outingId)
      .order('day', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.day);
  },

  fetchAvailabilities: async (outingId: string): Promise<MemberAvailability[]> => {
    const { data, error } = await supabase
      .from('outing_availabilities')
      .select('user_id, day, start_time, end_time')
      .eq('outing_id', outingId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      day: row.day,
      start: normalizeTime(row.start_time),
      end: normalizeTime(row.end_time),
    }));
  },

  /** Participants with their profile; the organizer comes first. */
  fetchMembers: async (outingId: string, organizerId: string): Promise<OutingMember[]> => {
    const { data, error } = await supabase
      .from('outing_participants')
      .select('user_id, status, invited_at')
      .eq('outing_id', outingId)
      .order('invited_at', { ascending: true });
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const profiles = await fetchProfiles(rows.map((row) => row.user_id));
    const members = rows.map((row) => ({
      userId: row.user_id,
      displayName: displayNameOf(profiles.get(row.user_id)),
      avatarUrl: profiles.get(row.user_id)?.avatar_url ?? null,
      status: row.status,
      isOrganizer: row.user_id === organizerId,
    }));
    return [...members].sort((a, b) => Number(b.isOrganizer) - Number(a.isOrganizer));
  },

  /** Invitations the user has not answered yet, most recent first. */
  fetchMyInvitations: async (userId: string): Promise<OutingInvitation[]> => {
    const { data, error } = await supabase
      .from('outing_participants')
      .select('invited_at, outings(*)')
      .eq('user_id', userId)
      .eq('status', 'invited')
      .order('invited_at', { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (data ?? []).filter(
      (row): row is { invited_at: string; outings: OutingRow } => row.outings !== null,
    );
    const profiles = await fetchProfiles([...new Set(rows.map((row) => row.outings.created_by))]);
    return rows.map((row) => ({
      outing: row.outings,
      organizerName: displayNameOf(profiles.get(row.outings.created_by)),
      invitedAt: row.invited_at,
    }));
  },

  /** Live updates of participants and availabilities. Returns the unsubscribe function. */
  subscribeToOutingScheduling: (outingId: string, onChange: () => void): (() => void) => {
    const filter = `outing_id=eq.${outingId}`;
    const channel = supabase
      .channel(`outing-scheduling-${outingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outing_participants', filter }, onChange)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'outing_availabilities', filter },
        onChange,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
