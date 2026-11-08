import { supabase } from '@/shared/lib/supabase';
import { outingSchedulingService } from '../services/outingSchedulingService';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

describe('outingSchedulingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createOutingWithInvites appelle la RPC avec le payload', async () => {
    mockRpc.mockResolvedValue({ data: 'outing-1', error: null });

    const id = await outingSchedulingService.createOutingWithInvites({
      title: 'Glouglou',
      startDate: '2026-11-10T17:00:00.000Z',
      days: ['2026-11-10'],
      slots: [{ day: '2026-11-10', start: '18:00', end: '23:00' }],
      inviteeIds: ['bob'],
    });

    expect(id).toBe('outing-1');
    expect(mockRpc).toHaveBeenCalledWith('create_outing_with_invites', {
      p_title: 'Glouglou',
      p_start_date: '2026-11-10T17:00:00.000Z',
      p_days: ['2026-11-10'],
      p_slots: [{ day: '2026-11-10', start: '18:00', end: '23:00' }],
      p_invitee_ids: ['bob'],
    });
  });

  it('createOutingWithInvites relaie les erreurs', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'invitee is not an accepted friend' } });
    await expect(
      outingSchedulingService.createOutingWithInvites({
        title: 'X',
        startDate: '2026-11-10T17:00:00.000Z',
        days: ['2026-11-10'],
        slots: [],
        inviteeIds: ['stranger'],
      }),
    ).rejects.toThrow('invitee is not an accepted friend');
  });

  it('respondToInvitation appelle la RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await outingSchedulingService.respondToInvitation('outing-1', 'accepted', [
      { day: '2026-11-10', start: '19:00', end: '22:00' },
    ]);
    expect(mockRpc).toHaveBeenCalledWith('respond_to_outing_invitation', {
      p_outing_id: 'outing-1',
      p_status: 'accepted',
      p_slots: [{ day: '2026-11-10', start: '19:00', end: '22:00' }],
    });
  });

  it('fetchOutingDays retourne les jours triés', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ day: '2026-11-10' }], error: null });
    const eq = jest.fn(() => ({ order }));
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq })) });

    await expect(outingSchedulingService.fetchOutingDays('outing-1')).resolves.toEqual(['2026-11-10']);
    expect(mockFrom).toHaveBeenCalledWith('outing_days');
    expect(eq).toHaveBeenCalledWith('outing_id', 'outing-1');
  });

  it('fetchAvailabilities normalise les heures', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [{ user_id: 'bob', day: '2026-11-10', start_time: '19:00:00', end_time: '22:00:00' }],
      error: null,
    });
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq })) });

    await expect(outingSchedulingService.fetchAvailabilities('outing-1')).resolves.toEqual([
      { userId: 'bob', day: '2026-11-10', start: '19:00', end: '22:00' },
    ]);
  });

  it('fetchMembers récupère les profils via get_profiles et place l’organisateur en premier', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { user_id: 'bob', status: 'invited', invited_at: '1' },
        { user_id: 'alice', status: 'accepted', invited_at: '2' },
      ],
      error: null,
    });
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq: jest.fn(() => ({ order })) })) });
    mockRpc.mockResolvedValue({
      data: [
        { id: 'alice', full_name: 'Alice', avatar_url: null, email: null },
        { id: 'bob', full_name: null, avatar_url: 'b.png', email: 'bob@crazer.app' },
      ],
      error: null,
    });

    const members = await outingSchedulingService.fetchMembers('outing-1', 'alice');

    expect(mockRpc).toHaveBeenCalledWith('get_profiles', { p_ids: ['bob', 'alice'] });
    expect(members).toEqual([
      { userId: 'alice', displayName: 'Alice', avatarUrl: null, status: 'accepted', isOrganizer: true },
      { userId: 'bob', displayName: 'bob', avatarUrl: 'b.png', status: 'invited', isOrganizer: false },
    ]);
  });

  it('fetchMyInvitations retourne les sorties avec le nom de l’organisateur', async () => {
    const outing = { id: 'outing-1', title: 'Glouglou', created_by: 'alice' };
    const order = jest.fn().mockResolvedValue({
      data: [
        { invited_at: '2026-11-01', outings: outing },
        { invited_at: '2026-11-02', outings: null },
      ],
      error: null,
    });
    const eqStatus = jest.fn(() => ({ order }));
    const eqUser = jest.fn(() => ({ eq: eqStatus }));
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq: eqUser })) });
    mockRpc.mockResolvedValue({
      data: [{ id: 'alice', full_name: 'Alice', avatar_url: null, email: null }],
      error: null,
    });

    const invitations = await outingSchedulingService.fetchMyInvitations('bob');

    expect(eqUser).toHaveBeenCalledWith('user_id', 'bob');
    expect(eqStatus).toHaveBeenCalledWith('status', 'invited');
    expect(invitations).toEqual([
      { outing, organizerName: 'Alice', invitedAt: '2026-11-01' },
    ]);
  });

  it('fetchMyNonAttendingOutingIds retourne les sorties invitées ou refusées', async () => {
    const inFn = jest.fn().mockResolvedValue({
      data: [{ outing_id: 'o1' }, { outing_id: 'o2' }],
      error: null,
    });
    const eq = jest.fn(() => ({ in: inFn }));
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq })) });

    await expect(outingSchedulingService.fetchMyNonAttendingOutingIds('bob')).resolves.toEqual([
      'o1',
      'o2',
    ]);
    expect(eq).toHaveBeenCalledWith('user_id', 'bob');
    expect(inFn).toHaveBeenCalledWith('status', ['invited', 'declined']);
  });

  it('subscribeToOutingScheduling écoute les deux tables et se désabonne', () => {
    const channel = { on: jest.fn(), subscribe: jest.fn() };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    (supabase.channel as jest.Mock).mockReturnValue(channel);
    const onChange = jest.fn();

    const unsubscribe = outingSchedulingService.subscribeToOutingScheduling('outing-1', onChange);

    expect(supabase.channel).toHaveBeenCalledWith('outing-scheduling-outing-1');
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'outing_participants', filter: 'outing_id=eq.outing-1' }),
      onChange,
    );
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'outing_availabilities', filter: 'outing_id=eq.outing-1' }),
      onChange,
    );
    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });

  it('les erreurs de lecture sont relayées', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq })) });
    await expect(outingSchedulingService.fetchAvailabilities('outing-1')).rejects.toThrow('boom');
  });
});
