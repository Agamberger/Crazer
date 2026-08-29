import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AddPlaceToOutingModal } from '../components/AddPlaceToOutingModal';
import { PlaceItem } from '../types/carte';
import { useOutingsStore } from '@/features/outings';
import { ensurePlaceExists } from '../services/placeService';
import { OutingRow, PlannedOutingRow } from '@/shared/types';

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
  created_at: '2026-08-05T10:00:00Z',
  updated_at: '2026-08-06T10:00:00Z',
};

describe('AddPlaceToOutingModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
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
        onClose={mockOnClose}
      />
    );
    expect(queryByTestId('modal-add-poi-to-outing')).toBeNull();
  });

  test('affiche la liste des sorties actives uniquement (exclut done et cancelled)', () => {
    const { getByText, queryByText, getByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose}
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
        onClose={mockOnClose}
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
        onClose={mockOnClose}
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

  test('permet de revenir à la sélection de sortie via le bouton retour', async () => {
    const { getByTestId } = render(
      <AddPlaceToOutingModal
        visible={true}
        place={mockPlace}
        onClose={mockOnClose}
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
        onClose={mockOnClose}
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

  test("enregistre le lieu et crée l'étape planifiée avec succès", async () => {
    (ensurePlaceExists as jest.Mock).mockResolvedValueOnce('created-place-uuid-123');

    const createdPlanned: PlannedOutingRow = {
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
        onClose={mockOnClose}
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
      expect(alertSpy).toHaveBeenCalledWith(
        'Étape ajoutée !',
        expect.stringContaining('Café de Flore')
      );
      expect(mockOnSuccess).toHaveBeenCalledWith(mockActiveOuting, createdPlanned);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
