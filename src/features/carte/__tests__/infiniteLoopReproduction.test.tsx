import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import CarteScreen from '../../../../app/(tabs)/carte';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

describe('Bug Reproduction - CarteScreen Infinite Reload Loop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 48.8566, longitude: 2.3522 },
    });
  });

  test('ne doit appeler la géolocalisation qu\'UNE SEULE fois au montage de CarteScreen', async () => {
    const { getByTestId } = render(<CarteScreen />);

    // Attendre que la géolocalisation et les requêtes initiales soient traitées
    await waitFor(() => {
      expect(getByTestId('map-view-container')).toBeTruthy();
    });

    // La géolocalisation doit être appelée exactement 1 seule fois et non en boucle infinie
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  });
});
