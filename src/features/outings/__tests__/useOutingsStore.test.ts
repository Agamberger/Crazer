import { useOutingsStore } from '../store/useOutingsStore';
import { outingService } from '../services/outingService';
import {
  OutingRow,
  OutingUpdate,
  PlannedOutingRow,
  PlannedOutingUpdate,
} from '@/shared/types';

jest.mock('../services/outingService', () => ({
  outingService: {
    fetchMyOutings: jest.fn(),
    createOuting: jest.fn(),
    getOutingById: jest.fn(),
    updateOuting: jest.fn(),
    fetchPlannedOutings: jest.fn(),
    createPlannedOuting: jest.fn(),
    updatePlannedOuting: jest.fn(),
    deletePlannedOuting: jest.fn(),
  },
}));

describe('useOutingsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: null,
      selectedPlannedOutingId: null,
      plannedOutings: [],
      isLoading: false,
      isLoadingPlannedOutings: false,
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

  it('fetchOutingById fetches and returns outing', async () => {
    const mockOuting: OutingRow = {
      id: 'out-456',
      title: 'Soirée Jeux',
      description: 'Jeux de société',
      start_date: '2026-08-29T19:00:00Z',
      created_by: 'user-1',
      status: 'planned',
      cover_image: null,
      created_at: '2026-08-24T20:00:00Z',
      updated_at: '2026-08-24T20:00:00Z',
    };

    (outingService.getOutingById as jest.Mock).mockResolvedValue(mockOuting);

    const result = await useOutingsStore.getState().fetchOutingById('out-456');

    expect(outingService.getOutingById).toHaveBeenCalledWith('out-456');
    expect(result).toEqual(mockOuting);
    expect(useOutingsStore.getState().outings).toContainEqual(mockOuting);
    expect(useOutingsStore.getState().isLoading).toBe(false);
  });

  it('fetchOutingById handles error gracefully', async () => {
    (outingService.getOutingById as jest.Mock).mockRejectedValue(
      new Error('Sortie introuvable')
    );

    const result = await useOutingsStore.getState().fetchOutingById('out-inexistant');

    expect(result).toBeNull();
    expect(useOutingsStore.getState().error).toBe('Sortie introuvable');
  });

  it('updateOuting updates outing in state and returns updated outing', async () => {
    const existingOuting: OutingRow = {
      id: 'out-789',
      title: 'Ancien Titre',
      description: 'Ancienne description',
      start_date: '2026-08-29T19:00:00Z',
      created_by: 'user-1',
      status: 'draft',
      cover_image: null,
      created_at: '2026-08-24T20:00:00Z',
      updated_at: '2026-08-24T20:00:00Z',
    };

    useOutingsStore.setState({ outings: [existingOuting] });

    const updates: OutingUpdate = {
      title: 'Titre Mis à Jour',
      status: 'planned',
    };

    const updatedOuting: OutingRow = {
      ...existingOuting,
      title: 'Titre Mis à Jour',
      status: 'planned',
      updated_at: '2026-08-24T21:00:00Z',
    };

    (outingService.updateOuting as jest.Mock).mockResolvedValue(updatedOuting);

    const result = await useOutingsStore.getState().updateOuting('out-789', updates);

    expect(outingService.updateOuting).toHaveBeenCalledWith('out-789', updates);
    expect(result).toEqual(updatedOuting);
    expect(useOutingsStore.getState().outings[0].title).toBe('Titre Mis à Jour');
    expect(useOutingsStore.getState().outings[0].status).toBe('planned');
    expect(useOutingsStore.getState().isLoading).toBe(false);
  });

  it('updateOuting handles error gracefully', async () => {
    (outingService.updateOuting as jest.Mock).mockRejectedValue(
      new Error('Erreur de mise à jour')
    );

    const result = await useOutingsStore.getState().updateOuting('out-789', { title: 'X' });

    expect(result).toBeNull();
    expect(useOutingsStore.getState().error).toBe('Erreur de mise à jour');
  });

  it('selectOuting updates selectedOutingId and resets selectedPlannedOutingId', () => {
    useOutingsStore.setState({ selectedPlannedOutingId: 'po-123' });
    useOutingsStore.getState().selectOuting('out-123');
    expect(useOutingsStore.getState().selectedOutingId).toBe('out-123');
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
  });

  it('selectPlannedOuting updates selectedPlannedOutingId', () => {
    useOutingsStore.getState().selectPlannedOuting('po-456');
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBe('po-456');
    useOutingsStore.getState().selectPlannedOuting(null);
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
  });

  describe('planned outings store methods', () => {
    it('fetchPlannedOutings fetches steps for an outing and sets state', async () => {
      const mockSteps: PlannedOutingRow[] = [
        {
          id: 'po-1',
          outing_id: 'out-1',
          title: 'Étape 1',
          description: null,
          notes: null,
          scheduled_for: '2026-08-30T18:00:00Z',
          duration_min: 60,
          status: 'pending',
          place_id: null,
          created_by: 'user-1',
          created_at: '2026-08-24T20:00:00Z',
          updated_at: '2026-08-24T20:00:00Z',
        },
      ];

      (outingService.fetchPlannedOutings as jest.Mock).mockResolvedValue(mockSteps);

      const result = await useOutingsStore.getState().fetchPlannedOutings('out-1');

      expect(outingService.fetchPlannedOutings).toHaveBeenCalledWith('out-1');
      expect(result).toEqual(mockSteps);
      expect(useOutingsStore.getState().plannedOutings).toEqual(mockSteps);
    });

    it('createPlannedOuting creates a first step starting at outing start_date', async () => {
      const parentOuting: OutingRow = {
        id: 'out-1',
        title: 'Sortie',
        description: null,
        start_date: '2026-08-30T18:00:00.000Z',
        created_by: 'user-1',
        status: 'draft',
        cover_image: null,
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };
      useOutingsStore.setState({ outings: [parentOuting], plannedOutings: [] });

      const createdStep: PlannedOutingRow = {
        id: 'po-first',
        outing_id: 'out-1',
        title: 'Étape 1',
        description: null,
        notes: null,
        scheduled_for: '2026-08-30T18:00:00.000Z',
        duration_min: 60,
        status: 'pending',
        place_id: null,
        created_by: 'user-1',
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      (outingService.createPlannedOuting as jest.Mock).mockResolvedValue(createdStep);

      const result = await useOutingsStore.getState().createPlannedOuting('out-1', 'user-1');

      expect(outingService.createPlannedOuting).toHaveBeenCalledWith(
        expect.objectContaining({
          outing_id: 'out-1',
          created_by: 'user-1',
          title: 'Étape 1',
          scheduled_for: '2026-08-30T18:00:00.000Z',
          duration_min: 60,
          status: 'pending',
        })
      );
      expect(result).toEqual(createdStep);
      expect(useOutingsStore.getState().plannedOutings).toEqual([createdStep]);
    });

    it('createPlannedOuting increments time based on previous step', async () => {
      const parentOuting: OutingRow = {
        id: 'out-1',
        title: 'Sortie',
        description: null,
        start_date: '2026-08-30T18:00:00.000Z',
        created_by: 'user-1',
        status: 'draft',
        cover_image: null,
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      const existingStep1: PlannedOutingRow = {
        id: 'po-1',
        outing_id: 'out-1',
        title: 'Étape 1',
        description: null,
        notes: null,
        scheduled_for: '2026-08-30T18:00:00.000Z',
        duration_min: 60,
        status: 'confirmed',
        place_id: null,
        created_by: 'user-1',
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      useOutingsStore.setState({
        outings: [parentOuting],
        plannedOutings: [existingStep1],
      });

      const createdStep2: PlannedOutingRow = {
        id: 'po-2',
        outing_id: 'out-1',
        title: 'Étape 2',
        description: null,
        notes: null,
        scheduled_for: '2026-08-30T19:00:00.000Z', // 18:00 + 60 min
        duration_min: 60,
        status: 'pending',
        place_id: null,
        created_by: 'user-1',
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      (outingService.createPlannedOuting as jest.Mock).mockResolvedValue(createdStep2);

      const result = await useOutingsStore.getState().createPlannedOuting('out-1', 'user-1');

      expect(outingService.createPlannedOuting).toHaveBeenCalledWith(
        expect.objectContaining({
          outing_id: 'out-1',
          title: 'Étape 2',
          scheduled_for: '2026-08-30T19:00:00.000Z',
        })
      );
      expect(result).toEqual(createdStep2);
      expect(useOutingsStore.getState().plannedOutings).toHaveLength(2);
    });

    it('updatePlannedOuting updates step in store', async () => {
      const existingStep: PlannedOutingRow = {
        id: 'po-1',
        outing_id: 'out-1',
        title: 'Ancien titre',
        description: null,
        notes: null,
        scheduled_for: '2026-08-30T18:00:00.000Z',
        duration_min: 60,
        status: 'pending',
        place_id: null,
        created_by: 'user-1',
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };
      useOutingsStore.setState({ plannedOutings: [existingStep] });

      const updates: PlannedOutingUpdate = { title: 'Nouveau titre' };
      const updatedStep = { ...existingStep, title: 'Nouveau titre' };

      (outingService.updatePlannedOuting as jest.Mock).mockResolvedValue(updatedStep);

      const result = await useOutingsStore.getState().updatePlannedOuting('po-1', updates);

      expect(result).toEqual(updatedStep);
      expect(useOutingsStore.getState().plannedOutings[0].title).toBe('Nouveau titre');
    });

    it('deletePlannedOuting removes step from store and clears selectedPlannedOutingId if matching', async () => {
      const existingStep: PlannedOutingRow = {
        id: 'po-1',
        outing_id: 'out-1',
        title: 'Étape à supprimer',
        description: null,
        notes: null,
        scheduled_for: '2026-08-30T18:00:00.000Z',
        duration_min: 60,
        status: 'pending',
        place_id: null,
        created_by: 'user-1',
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };
      useOutingsStore.setState({
        plannedOutings: [existingStep],
        selectedPlannedOutingId: 'po-1',
      });

      (outingService.deletePlannedOuting as jest.Mock).mockResolvedValue(undefined);

      const success = await useOutingsStore.getState().deletePlannedOuting('po-1');

      expect(success).toBe(true);
      expect(useOutingsStore.getState().plannedOutings).toEqual([]);
      expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
    });
  });
});
