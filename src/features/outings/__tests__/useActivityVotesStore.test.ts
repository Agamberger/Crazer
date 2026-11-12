import { activityVotesService } from '../services/activityVotesService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('../services/activityVotesService', () => ({
  activityVotesService: {
    fetchActivities: jest.fn(),
    fetchVotes: jest.fn(),
    proposeActivity: jest.fn(),
    deleteActivity: jest.fn(),
    castVote: jest.fn(),
    removeVote: jest.fn(),
    chooseActivity: jest.fn(),
    drawActivity: jest.fn(),
    reopenActivities: jest.fn(),
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

  it('propose, retient, rouvre et supprime via le service', async () => {
    const store = useActivityVotesStore.getState();
    await store.proposeActivity({ outingId: 'o1', userId: 'alice', day: null, title: 'Ciné', note: null, placeId: null });
    await store.chooseActivity('o1', 'a1');
    await store.reopenActivities('o1', '2026-11-10');
    await store.deleteActivity('o1', 'a1');
    expect(service.proposeActivity).toHaveBeenCalled();
    expect(service.chooseActivity).toHaveBeenCalledWith('a1');
    expect(service.reopenActivities).toHaveBeenCalledWith('o1', '2026-11-10');
    expect(service.deleteActivity).toHaveBeenCalledWith('a1');
  });

  it('le tirage renvoie le gagnant', async () => {
    service.drawActivity.mockResolvedValue('a2');
    await expect(useActivityVotesStore.getState().drawActivity('o1', null)).resolves.toBe('a2');
  });

  it('relance l’erreur et garde son message quand une action échoue', async () => {
    service.chooseActivity.mockRejectedValue(new Error('only the organizer'));
    await expect(useActivityVotesStore.getState().chooseActivity('o1', 'a1')).rejects.toThrow();
    expect(useActivityVotesStore.getState().error).toBe('only the organizer');
    expect(useActivityVotesStore.getState().isSaving).toBe(false);
    expect(service.fetchActivities).not.toHaveBeenCalled();
  });
});
