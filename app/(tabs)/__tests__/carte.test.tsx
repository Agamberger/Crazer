import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import CarteScreen from '../carte';
import { PlaceItem, useMapStore } from '@/features/carte';
import { ensurePlaceExists } from '@/features/carte/services/placeService';
import { useOutingsStore } from '@/features/outings';
import { OutingRow } from '@/shared/types';

jest.mock('@/features/carte/services/placeService', () => ({
  ...jest.requireActual('@/features/carte/services/placeService'),
  ensurePlaceExists: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 48.8566, longitude: 2.3522 },
  }),
}));

const mockTargetOuting: OutingRow = {
  id: 'target-out-1',
  title: 'Sortie Anniversaire',
  description: 'Fête entre amis',
  start_date: '2026-09-01T20:00:00.000Z',
  created_by: 'user-123',
  status: 'planned',
  cover_image: null,
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

describe('CarteScreen', () => {
  beforeEach(() => {
    useMapStore.setState({
      targetOutingId: null,
      selectedPlaceId: null,
      places: [],
    });
    useOutingsStore.setState({
      outings: [mockTargetOuting],
      plannedOutings: [],
      isLoading: false,
    });
  });

  test("doit afficher correctement l'écran de carte avec SafeAreaView de react-native-safe-area-context", async () => {
    const { getByTestId } = render(<CarteScreen />);
    await waitFor(() => {
      expect(getByTestId('map-view-container')).toBeTruthy();
    });
  });

  test('affiche le bandeau de sortie cible quand targetOutingId est défini et permet de le quitter', async () => {
    useMapStore.setState({ targetOutingId: 'target-out-1' });

    const { getByTestId, getByText, queryByTestId } = render(<CarteScreen />);

    await waitFor(() => {
      expect(getByTestId('target-outing-banner')).toBeTruthy();
    });

    expect(getByText('🎯 Ajout à la sortie')).toBeTruthy();
    expect(getByText('Sortie Anniversaire')).toBeTruthy();

    fireEvent.press(getByTestId('btn-clear-target-outing'));
    expect(useMapStore.getState().targetOutingId).toBeNull();
    expect(queryByTestId('target-outing-banner')).toBeNull();
  });

  describe('« Nouvelle sortie » depuis la fiche d’un lieu', () => {
    const place: PlaceItem = {
      id: 'osm-1',
      title: 'Burger Gourmet',
      category: 'resto',
      latitude: 48.85,
      longitude: 2.35,
      address: '1 rue de Paris',
      rating: 4.5,
      reviewsCount: 10,
    };

    beforeEach(() => {
      jest.clearAllMocks();
      useOutingsStore.setState({ outings: [], fetchOutings: jest.fn() });
      useMapStore.setState({ places: [place], selectedPlaceId: place.id, targetOutingId: null });
    });

    test('enregistre le lieu puis ouvre l’assistant de création autour de lui', async () => {
      (ensurePlaceExists as jest.Mock).mockResolvedValueOnce('place-uuid-1');
      const { getByTestId } = render(<CarteScreen />);

      fireEvent.press(getByTestId('add-to-outing-button'));
      fireEvent.press(getByTestId('btn-create-outing-empty'));

      await waitFor(() => {
        expect(useRouter().push).toHaveBeenCalledWith({
          pathname: '/outing/create',
          params: { placeId: 'place-uuid-1', placeName: 'Burger Gourmet' },
        });
      });
      expect(ensurePlaceExists).toHaveBeenCalledWith(place, undefined);
    });

    test('reste sur la carte et affiche l’erreur si le lieu ne peut pas être enregistré', async () => {
      (ensurePlaceExists as jest.Mock).mockRejectedValueOnce(new Error('RLS'));
      const { getByTestId } = render(<CarteScreen />);

      fireEvent.press(getByTestId('add-to-outing-button'));
      fireEvent.press(getByTestId('btn-create-outing-empty'));

      await waitFor(() => expect(getByTestId('error-create-outing')).toBeTruthy());
      expect(useRouter().push).not.toHaveBeenCalled();
    });
  });
});
