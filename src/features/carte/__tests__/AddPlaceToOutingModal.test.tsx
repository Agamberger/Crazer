import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AddPlaceToOutingModal } from '../components/AddPlaceToOutingModal';
import { PlaceItem } from '../types/carte';
import { outingSchedulingService, useOutingSchedulingStore, useOutingsStore } from '@/features/outings';
import { ensurePlaceExists } from '../services/placeService';
import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { useMapStore } from '../store/useMapStore';
import { useToastStore } from '@/shared/store/useToastStore';

jest.mock('../services/placeService', () => ({
  ensurePlaceExists: jest.fn(),
  createCustomPlace: jest.fn(),
  searchPlaces: jest.fn(),
  fetchNearbyPlaces: jest.fn(),
}));

jest.mock('@/features/outings/services/outingService', () => ({
  outingService: {
    fetchMyOutings: jest.fn().mockResolvedValue([]),
    fetchPlannedOutings: jest.fn().mockResolvedValue([]),
    createOuting: jest.fn(),
    createPlannedOuting: jest.fn(),
    updatePlannedOuting: jest.fn(),
    deletePlannedOuting: jest.fn(),
  },
}));

jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-test-123', email: 'test@example.com' },
  }),
}));

const mockPlace: PlaceItem = {
  id: 'place-test-1',
  title: 'Café de Flore',
  category: 'resto',
  latitude: 48.854,
  longitude: 2.333,
  address: '172 Boulevard Saint-Germain, 75006 Paris',
  rating: 4.6,
  reviewsCount: 120,
  description: 'Un célèbre café parisien.',
  priceRange: '€€€',
  phone: '0145485526',
  website: 'https://cafedeflore.fr',
};

const mockActiveOuting: OutingRow = {
  id: 'outing-active-1',
  title: 'Soirée entre amis',
  description: 'Une super soirée',
  start_date: '2026-09-01T19:00:00.000Z',
  created_by: 'user-test-123',
  status: 'planned',
  cover_image: null,
  outing_type: null,
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

const mockDoneOuting: OutingRow = {
  id: 'outing-done-2',
  title: 'Sortie passée',
  description: 'Terminée',
  start_date: '2026-08-01T19:00:00.000Z',
  created_by: 'user-test-123',
  status: 'done',
  cover_image: null,
  outing_type: null,
  created_at: '2026-07-20T10:00:00Z',
  updated_at: '2026-08-02T10:00:00Z',
};

const mockCancelledOuting: OutingRow = {
  id: 'outing-cancelled-3',
  title: 'Sortie annulée',
  description: 'Annulée',
  start_date: '2026-08-10T19:00:00.000Z',
  created_by: 'user-test-123',
  status: 'cancelled',
  cover_image: null,
  outing_type: null,
  created_at: '2026-08-05T10:00:00Z',
  updated_at: '2026-08-06T10:00:00Z',
};

describe('AddPlaceToOutingModal', () => {
  const mockOnClose = jest.fn();
  const mockOnCreateNewOuting = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useToastStore.getState().clear();
    useMapStore.setState({ targetOutingId: null });
    useOutingsStore.setState({
      outings: [mockActiveOuting, mockDoneOuting, mockCancelledOuting],
      plannedOutings: [],
      isLoading: false,
      isLoadingPlannedOutings: false,
      error: null,
    });
  });

  test('ne rend rien si place est null', () => {
    const { queryByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={null}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );
    expect(queryByTestId('modal-add-poi-to-outing')).toBeNull();
  });

  test('affiche la liste des sorties actives uniquement (exclut done et cancelled)', () => {
    const { getByText, queryByText, getByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    expect(getByTestId('step-select-outing')).toBeTruthy();
    expect(getByText('Café de Flore')).toBeTruthy();
    expect(getByText('Soirée entre amis')).toBeTruthy();
    expect(queryByText('Sortie passée')).toBeNull();
    expect(queryByText('Sortie annulée')).toBeNull();
  });

  test("affiche l'état vide si aucune sortie active n'existe", () => {
    useOutingsStore.setState({
      outings: [mockDoneOuting, mockCancelledOuting],
    });

    const { getByTestId, getByText } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    expect(getByTestId('empty-outings-state')).toBeTruthy();
    expect(getByText('Aucune sortie active')).toBeTruthy();
  });

  test("sélectionner une sortie ouvre l'étape de planification préremplie", async () => {
    const { getByTestId, getByText } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    fireEvent.press(getByTestId(`btn-select-outing-${mockActiveOuting.id}`));

    await waitFor(() => {
      expect(getByTestId('step-edit-planned')).toBeTruthy();
    });

    expect(getByText('Soirée entre amis')).toBeTruthy();
    expect(getByTestId('input-planned-title').props.value).toBe('Café de Flore');
    expect(getByTestId('input-planned-description').props.value).toBe('Un célèbre café parisien.');
    expect(getByTestId('input-planned-notes').props.value).toContain('0145485526');
  });

  test("préremplit l'étape d'une sortie sans date avec son premier jour candidat", async () => {
    jest.spyOn(outingSchedulingService, 'fetchOutingDays').mockResolvedValue(['2026-11-14']);
    const undated: OutingRow = { ...mockActiveOuting, id: 'outing-undated', start_date: null };

    const { getByTestId, queryByTestId, findByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        initialOuting={undated}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    expect(getByTestId('step-base-date-loader')).toBeTruthy();
    expect(queryByTestId('input-planned-title')).toBeNull();
    expect((await findByTestId('input-planned-title')).props.value).toBe('Café de Flore');
    expect(queryByTestId('step-base-date-loader')).toBeNull();
  });

  test('ouvre directement en étape 2 edit-planned si initialOuting est fourni', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        initialOuting={mockActiveOuting}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    expect(queryByTestId('step-select-outing')).toBeNull();
    expect(getByTestId('step-edit-planned')).toBeTruthy();
    expect(getByText('Soirée entre amis')).toBeTruthy();
    expect(getByTestId('input-planned-title').props.value).toBe('Café de Flore');
  });

  test('ouvre directement en étape 2 edit-planned si targetOutingId est défini dans useMapStore', () => {
    useMapStore.setState({ targetOutingId: mockActiveOuting.id });

    const { getByTestId, getByText, queryByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    expect(queryByTestId('step-select-outing')).toBeNull();
    expect(getByTestId('step-edit-planned')).toBeTruthy();
    expect(getByText('Soirée entre amis')).toBeTruthy();
  });

  test('permet de revenir à la sélection de sortie via le bouton retour', async () => {
    const { getByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    fireEvent.press(getByTestId(`btn-select-outing-${mockActiveOuting.id}`));
    await waitFor(() => {
      expect(getByTestId('step-edit-planned')).toBeTruthy();
    });

    fireEvent.press(getByTestId('btn-back-to-outings-list'));
    expect(getByTestId('step-select-outing')).toBeTruthy();
  });

  test("affiche une erreur si le nom de l'étape est vide lors de la soumission", async () => {
    const { getByTestId, getByText } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    fireEvent.press(getByTestId(`btn-select-outing-${mockActiveOuting.id}`));
    await waitFor(() => {
      expect(getByTestId('step-edit-planned')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('input-planned-title'), '');
    fireEvent.press(getByTestId('btn-submit-planned-step'));

    expect(getByText("Le nom de l'étape est obligatoire.")).toBeTruthy();
  });

  test('« Nouvelle sortie » délègue au parent la création autour du lieu, puis ferme la modale', async () => {
    useOutingsStore.setState({ outings: [] });
    mockOnCreateNewOuting.mockResolvedValueOnce(undefined);

    const { getByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose}
        onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    fireEvent.press(getByTestId('btn-create-outing-empty'));

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
    expect(mockOnCreateNewOuting).toHaveBeenCalledWith(mockPlace);
  });

  test("affiche l'erreur de préparation de la nouvelle sortie dans la modale (un toast serait masqué par la modale)", async () => {
    useOutingsStore.setState({ outings: [] });
    mockOnCreateNewOuting.mockRejectedValueOnce(new Error('network'));

    const { getByTestId, getByText } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose}
        onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    fireEvent.press(getByTestId('btn-create-outing-empty'));

    await waitFor(() => {
      expect(getByTestId('error-create-outing')).toBeTruthy();
    });
    expect(
      getByText('Impossible de préparer la nouvelle sortie. Réessaie dans un instant.')
    ).toBeTruthy();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test("ne propose pas les sorties dont l'utilisateur est seulement invité ou qu'il a refusées", () => {
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: [mockActiveOuting.id] });

    const { queryByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose}
        onCreateNewOuting={mockOnCreateNewOuting}
      />
    );

    expect(queryByTestId(`btn-select-outing-${mockActiveOuting.id}`)).toBeNull();
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: [] });
  });

  test("enregistre le lieu et crée l'étape planifiée avec succès", async () => {
    (ensurePlaceExists as jest.Mock).mockResolvedValueOnce('created-place-uuid-123');

    const createdPlanned: PlannedOutingRow = {
      activity_id: null,
      id: 'po-new-1',
      outing_id: mockActiveOuting.id,
      place_id: 'created-place-uuid-123',
      title: 'Café de Flore Modifié',
      description: 'Desc',
      notes: 'Notes',
      scheduled_for: '2026-09-01T19:00:00.000Z',
      duration_min: 90,
      status: 'confirmed',
      created_by: 'user-test-123',
      created_at: '2026-08-25T10:00:00Z',
      updated_at: '2026-08-25T10:00:00Z',
    };

    const addPlannedOutingSpy = jest
      .spyOn(useOutingsStore.getState(), 'addPlannedOuting')
      .mockResolvedValueOnce(createdPlanned);

    const { getByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose} onCreateNewOuting={mockOnCreateNewOuting}
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.press(getByTestId(`btn-select-outing-${mockActiveOuting.id}`));
    await waitFor(() => {
      expect(getByTestId('step-edit-planned')).toBeTruthy();
    });

    fireEvent.changeText(getByTestId('input-planned-title'), 'Café de Flore Modifié');
    fireEvent.press(getByTestId('chip-duration-90'));
    fireEvent.press(getByTestId('btn-status-confirmed'));
    fireEvent.press(getByTestId('btn-submit-planned-step'));

    await waitFor(() => {
      expect(ensurePlaceExists).toHaveBeenCalledWith(mockPlace, 'user-test-123');
      expect(addPlannedOutingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          outing_id: mockActiveOuting.id,
          place_id: 'created-place-uuid-123',
          title: 'Café de Flore Modifié',
          duration_min: 90,
          status: 'confirmed',
        })
      );
      expect(useToastStore.getState().queue).toContainEqual(
        expect.objectContaining({
          tone: 'success',
          title: 'Étape ajoutée !',
          message: expect.stringContaining('Café de Flore'),
        })
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockActiveOuting, createdPlanned);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
