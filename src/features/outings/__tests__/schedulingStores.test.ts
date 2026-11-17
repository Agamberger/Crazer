import { resetUserScopedStores } from '@/shared/store/sessionReset';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { DEFAULT_TIME_RANGE } from '../utils/availabilityUtils';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    createOutingWithInvites: jest.fn(),
    respondToInvitation: jest.fn(),
    inviteToOuting: jest.fn(),
    setOutingDays: jest.fn(),
    setMySlots: jest.fn(),
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
    fetchMyInvitations: jest.fn(),
    fetchMyNonAttendingOutingIds: jest.fn(),
  },
}));

const service = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

describe('useOutingSchedulingStore', () => {
  const fetchOutingById = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
    useOutingsStore.setState({ fetchOutingById });
  });

  it('crée la sortie avec la date du premier jour et recharge la sortie', async () => {
    service.createOutingWithInvites.mockResolvedValue('outing-1');

    const id = await useOutingSchedulingStore.getState().createOutingWithInvites({
      title: '  Glouglou ',
      outingType: 'precise',
      days: ['2026-11-11', '2026-11-10'],
      slots: {
        '2026-11-10': { start: '12:00', end: '21:00' },
        '2026-11-11': { start: '18:00', end: '23:00' },
      },
      inviteeIds: ['bob'],
    });

    expect(id).toBe('outing-1');
    expect(service.createOutingWithInvites).toHaveBeenCalledWith({
      title: 'Glouglou',
      outingType: 'precise',
      days: ['2026-11-10', '2026-11-11'],
      slots: [
        { day: '2026-11-10', start: '12:00', end: '21:00' },
        { day: '2026-11-11', start: '18:00', end: '23:00' },
      ],
      inviteeIds: ['bob'],
    });
    expect(fetchOutingById).toHaveBeenCalledWith('outing-1');
    expect(useOutingSchedulingStore.getState().isSubmitting).toBe(false);
  });

  it('inviteFriends invite puis recharge les membres de la sortie', async () => {
    service.inviteToOuting.mockResolvedValue(1);
    service.fetchOutingDays.mockResolvedValue([]);
    service.fetchAvailabilities.mockResolvedValue([]);
    service.fetchMembers.mockResolvedValue([]);

    const count = await useOutingSchedulingStore
      .getState()
      .inviteFriends({ id: 'outing-1', created_by: 'alice' }, ['bob']);

    expect(count).toBe(1);
    expect(service.inviteToOuting).toHaveBeenCalledWith('outing-1', ['bob']);
    expect(service.fetchMembers).toHaveBeenCalledWith('outing-1', 'alice');
    expect(useOutingSchedulingStore.getState().isSubmitting).toBe(false);
  });

  it('saveDays enregistre les jours triés puis recharge la sortie', async () => {
    service.setOutingDays.mockResolvedValue();
    service.fetchOutingDays.mockResolvedValue(['2026-11-10', '2026-11-12']);
    service.fetchAvailabilities.mockResolvedValue([]);
    service.fetchMembers.mockResolvedValue([]);

    await useOutingSchedulingStore
      .getState()
      .saveDays({ id: 'outing-1', created_by: 'alice' }, ['2026-11-12', '2026-11-10']);

    expect(service.setOutingDays).toHaveBeenCalledWith('outing-1', ['2026-11-10', '2026-11-12']);
    expect(useOutingSchedulingStore.getState().schedulingByOutingId['outing-1']?.days).toEqual([
      '2026-11-10',
      '2026-11-12',
    ]);
    expect(useOutingSchedulingStore.getState().isSubmitting).toBe(false);
  });

  it('saveMySlots relaie l’échec sans recharger', async () => {
    service.setMySlots.mockRejectedValue(
      new Error('only an attendee can change their availability'),
    );
    await expect(
      useOutingSchedulingStore.getState().saveMySlots({ id: 'outing-1', created_by: 'alice' }, []),
    ).rejects.toThrow('only an attendee');
    expect(useOutingSchedulingStore.getState().error).toBe(
      'only an attendee can change their availability',
    );
    expect(service.fetchMembers).not.toHaveBeenCalled();
  });

  it('inviteFriends relaie l’échec et mémorise l’erreur', async () => {
    service.inviteToOuting.mockRejectedValue(new Error('only the organizer can invite'));
    await expect(
      useOutingSchedulingStore
        .getState()
        .inviteFriends({ id: 'outing-1', created_by: 'alice' }, ['bob']),
    ).rejects.toThrow('only the organizer can invite');
    expect(useOutingSchedulingStore.getState().error).toBe('only the organizer can invite');
    expect(service.fetchMembers).not.toHaveBeenCalled();
  });

  it('relaie l’échec de création et mémorise l’erreur', async () => {
    service.createOutingWithInvites.mockRejectedValue(new Error('RLS'));
    await expect(
      useOutingSchedulingStore.getState().createOutingWithInvites({
        title: 'X',
        outingType: null,
        days: ['2026-11-10'],
        slots: { '2026-11-10': DEFAULT_TIME_RANGE },
        inviteeIds: [],
      }),
    ).rejects.toThrow('RLS');
    expect(useOutingSchedulingStore.getState().error).toBe('RLS');
  });

  it('charge les invitations, avec un état d’erreur en cas d’échec', async () => {
    const invitation = {
      outing: { id: 'o1' } as never,
      organizerName: 'Alice',
      invitedAt: '2026-11-01',
    };
    service.fetchMyInvitations.mockResolvedValueOnce([invitation]);
    service.fetchMyNonAttendingOutingIds.mockResolvedValueOnce(['o1', 'o-declined']);
    await useOutingSchedulingStore.getState().fetchInvitations('bob');
    expect(useOutingSchedulingStore.getState().invitations).toEqual([invitation]);
    expect(useOutingSchedulingStore.getState().nonAttendingOutingIds).toEqual(['o1', 'o-declined']);

    service.fetchMyInvitations.mockRejectedValueOnce(new Error('offline'));
    service.fetchMyNonAttendingOutingIds.mockResolvedValueOnce([]);
    await expect(useOutingSchedulingStore.getState().fetchInvitations('bob')).resolves.toEqual([]);
    expect(useOutingSchedulingStore.getState().error).toBe('offline');
  });

  it('accepter retire l’invitation et recharge la sortie', async () => {
    useOutingSchedulingStore.setState({
      invitations: [{ outing: { id: 'o1' } as never, organizerName: 'Alice', invitedAt: '' }],
    });
    service.respondToInvitation.mockResolvedValue();
    const slots = [{ day: '2026-11-10', start: '19:00', end: '22:00' }];

    await useOutingSchedulingStore.getState().respondToInvitation('o1', 'accepted', slots);

    expect(service.respondToInvitation).toHaveBeenCalledWith('o1', 'accepted', slots);
    expect(useOutingSchedulingStore.getState().invitations).toEqual([]);
    expect(fetchOutingById).toHaveBeenCalledWith('o1');
  });

  it('refuser ne recharge pas la sortie et la range parmi celles non suivies', async () => {
    service.respondToInvitation.mockResolvedValue();
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: ['o1'] });

    await useOutingSchedulingStore.getState().respondToInvitation('o1', 'declined', []);

    expect(fetchOutingById).not.toHaveBeenCalled();
    expect(useOutingSchedulingStore.getState().nonAttendingOutingIds).toEqual(['o1']);
  });

  it('accepter retire la sortie des sorties non suivies', async () => {
    service.respondToInvitation.mockResolvedValue();
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: ['o1', 'o2'] });

    await useOutingSchedulingStore.getState().respondToInvitation('o1', 'accepted', []);

    expect(useOutingSchedulingStore.getState().nonAttendingOutingIds).toEqual(['o2']);
  });

  it('charge la planification d’une sortie', async () => {
    service.fetchOutingDays.mockResolvedValue(['2026-11-10']);
    service.fetchAvailabilities.mockResolvedValue([]);
    service.fetchMembers.mockResolvedValue([]);

    await useOutingSchedulingStore.getState().fetchScheduling({ id: 'o1', created_by: 'alice' });

    expect(service.fetchMembers).toHaveBeenCalledWith('o1', 'alice');
    expect(useOutingSchedulingStore.getState().schedulingByOutingId.o1).toEqual({
      days: ['2026-11-10'],
      availabilities: [],
      members: [],
    });
  });

  it('ignore une réponse arrivée après une déconnexion', async () => {
    let resolve: (value: string[]) => void = () => undefined;
    service.fetchOutingDays.mockReturnValue(new Promise((r) => (resolve = r)));
    service.fetchAvailabilities.mockResolvedValue([]);
    service.fetchMembers.mockResolvedValue([]);

    const pending = useOutingSchedulingStore
      .getState()
      .fetchScheduling({ id: 'o1', created_by: 'a' });
    resetUserScopedStores();
    resolve(['2026-11-10']);
    await pending;

    expect(useOutingSchedulingStore.getState().schedulingByOutingId).toEqual({});
  });
});
