import { activityVotesService } from '../services/activityVotesService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingsStore } from '../store/useOutingsStore';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('../services/activityVotesService', () => ({
  activityVotesService: {
    fetchActivities: jest.fn(),
    fetchVotes: jest.fn(),
    proposeActivity: jest.fn(),
    deleteActivity: jest.fn(),
    castVote: jest.fn(),
    removeVote: jest.fn(),
    placeActivity: jest.fn(),
  },
}));

const service = activityVotesService as jest.Mocked<typeof activityVotesService>;

describe('useActivityVotesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useActivityVotesStore.setState(useActivityVotesStore.getInitialState(), true);
    service.fetchActivities.mockResolvedValue([]);
    service.fetchVotes.mockResolvedValue([]);
  });

  it('charge les activités et les votes de la sortie', async () => {
    service.fetchVotes.mockResolvedValue([{ activityId: 'a1', userId: 'bob', vote: 'accepted' }]);
    const loaded = await useActivityVotesStore.getState().fetchActivities('o1');
    expect(loaded?.votes).toHaveLength(1);
    expect(useActivityVotesStore.getState().activitiesByOutingId.o1).toBe(loaded);
  });

  it('garde l’erreur et renvoie null si le chargement échoue', async () => {
    service.fetchActivities.mockRejectedValue(new Error('boom'));
    await expect(useActivityVotesStore.getState().fetchActivities('o1')).resolves.toBeNull();
    expect(useActivityVotesStore.getState().error).toBe('boom');
  });

  it('voter enregistre le vote puis recharge', async () => {
    await useActivityVotesStore.getState().vote('o1', 'a1', 'bob', 'maybe');
    expect(service.castVote).toHaveBeenCalledWith('o1', 'a1', 'bob', 'maybe');
    expect(service.fetchActivities).toHaveBeenCalledWith('o1');
    expect(useActivityVotesStore.getState().isSaving).toBe(false);
  });

  it('voter null retire le vote', async () => {
    await useActivityVotesStore.getState().vote('o1', 'a1', 'bob', null);
    expect(service.removeVote).toHaveBeenCalledWith('a1', 'bob');
    expect(service.castVote).not.toHaveBeenCalled();
  });

  it('propose et supprime via le service', async () => {
    const store = useActivityVotesStore.getState();
    await store.proposeActivity({
      outingId: 'o1',
      userId: 'alice',
      title: 'Ciné',
      note: null,
      placeId: null,
    });
    await store.deleteActivity('o1', 'a1');
    expect(service.proposeActivity).toHaveBeenCalled();
    expect(service.deleteActivity).toHaveBeenCalledWith('a1');
  });

  it('place une activité puis recharge la pool et les étapes', async () => {
    const fetchPlannedOutings = jest.fn();
    useOutingsStore.setState({ fetchPlannedOutings });
    service.placeActivity.mockResolvedValue('step-1');

    await expect(
      useActivityVotesStore.getState().placeActivity({
        outingId: 'o1',
        activityId: 'a1',
        scheduledFor: '2026-11-20T17:00:00.000Z',
        durationMin: 60,
      }),
    ).resolves.toBe('step-1');
    expect(service.placeActivity).toHaveBeenCalledWith('a1', '2026-11-20T17:00:00.000Z', 60);
    expect(service.fetchActivities).toHaveBeenCalledWith('o1');
    expect(fetchPlannedOutings).toHaveBeenCalledWith('o1');
  });

  it('relance l’erreur et garde son message quand une action échoue', async () => {
    service.placeActivity.mockRejectedValue(new Error('activity already placed'));
    await expect(
      useActivityVotesStore.getState().placeActivity({
        outingId: 'o1',
        activityId: 'a1',
        scheduledFor: 't',
        durationMin: 60,
      }),
    ).rejects.toThrow();
    expect(useActivityVotesStore.getState().error).toBe('activity already placed');
    expect(useActivityVotesStore.getState().isSaving).toBe(false);
    expect(service.fetchActivities).not.toHaveBeenCalled();
  });
});
