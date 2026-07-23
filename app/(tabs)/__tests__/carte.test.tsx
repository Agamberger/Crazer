import React from 'react';
import { render } from '@testing-library/react-native';
import CarteScreen from '../carte';

describe('CarteScreen', () => {
  test('doit afficher correctement l\'écran de carte avec SafeAreaView de react-native-safe-area-context', () => {
    const { getByTestId } = render(<CarteScreen />);
    expect(getByTestId('map-view-container')).toBeTruthy();
  });
});
