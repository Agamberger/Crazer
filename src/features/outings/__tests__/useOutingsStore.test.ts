import { useOutingsStore } from '../store/useOutingsStore';
import { outingService } from '../services/outingService';
import { OutingRow } from '@/shared/types';

jest.mock('../services/outingService', () => ({
  outingService: {
    fetchMyOutings: jest.fn(),
    createOuting: jest.fn(),
  },
}));

describe('useOutingsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: null,
      isLoading: false,
      error: null,
    });
  });

  it('fetchOutings populates outings state', async () => {
    const mockOutings: OutingRow[] = [
      {
        id: 'out-1',
        title: 'Sortie Plage',
        description: 'Une belle journée',
        start_date: '2026-08-30T10:00:00Z',
        created_by: 'user-1',
        status: 'planned',
        cover_image: null,
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      },
    ];

    (outingService.fetchMyOutings as jest.Mock).mockResolvedValue(mockOutings);

    await useOutingsStore.getState().fetchOutings();

    expect(outingService.fetchMyOutings).toHaveBeenCalled();
    expect(useOutingsStore.getState().outings).toEqual(mockOutings);
    expect(useOutingsStore.getState().isLoading).toBe(false);
    expect(useOutingsStore.getState().error).toBeNull();
  });

  it('fetchOutings sets error state on failure', async () => {
    (outingService.fetchMyOutings as jest.Mock).mockRejectedValue(
      new Error('Erreur de chargement')
    );

    await useOutingsStore.getState().fetchOutings();

    expect(useOutingsStore.getState().isLoading).toBe(false);
    expect(useOutingsStore.getState().error).toBe('Erreur de chargement');
  });

  it('createOuting adds a new outing to state', async () => {
    const newOutingRow: OutingRow = {
      id: 'out-new',
      title: 'Nouvelle sortie',
      description: null,
      start_date: '2026-08-25T20:00:00Z',
      created_by: 'user-1',
      status: 'draft',
      cover_image: null,
      created_at: '2026-08-24T20:00:00Z',
      updated_at: '2026-08-24T20:00:00Z',
    };

    (outingService.createOuting as jest.Mock).mockResolvedValue(newOutingRow);

    await useOutingsStore.getState().createOuting('user-1');

    expect(outingService.createOuting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Nouvelle sortie',
        created_by: 'user-1',
        status: 'draft',
      })
    );
    expect(useOutingsStore.getState().outings[0]).toEqual(newOutingRow);
    expect(useOutingsStore.getState().isLoading).toBe(false);
  });

  it('selectOuting updates selectedOutingId', () => {
    useOutingsStore.getState().selectOuting('out-123');
    expect(useOutingsStore.getState().selectedOutingId).toBe('out-123');
  });
});
