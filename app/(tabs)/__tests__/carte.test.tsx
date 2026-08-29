import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import CarteScreen from '../carte';
import { useMapStore } from '@/features/carte';
import { useOutingsStore } from '@/features/outings';
import { OutingRow } from '@/shared/types';

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
});
