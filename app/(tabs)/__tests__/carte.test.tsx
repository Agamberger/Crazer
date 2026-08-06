import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import CarteScreen from '../carte';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 48.8566, longitude: 2.3522 },
  }),
}));

describe('CarteScreen', () => {
  test('doit afficher correctement l\'écran de carte avec SafeAreaView de react-native-safe-area-context', async () => {
    const { getByTestId } = render(<CarteScreen />);
    await waitFor(() => {
      expect(getByTestId('map-view-container')).toBeTruthy();
    });
  });
});

