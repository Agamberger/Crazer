import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSelector } from '../components/StyleSelector';
import { useMapStore } from '../store/useMapStore';

describe('StyleSelector', () => {
  beforeEach(() => useMapStore.getState().setMapStyleMode('dark'));

  test('propose les trois styles OpenFreeMap', () => {
    const { getByText } = render(<StyleSelector />);

    expect(getByText('Sombre')).toBeTruthy();
    expect(getByText('Coloré')).toBeTruthy();
    expect(getByText('Clair')).toBeTruthy();
  });

  test('change le style de la carte au clic', () => {
    const { getByLabelText } = render(<StyleSelector />);

    fireEvent.press(getByLabelText('Changer le style de carte en mode Clair'));
    expect(useMapStore.getState().mapStyleMode).toBe('positron');

    fireEvent.press(getByLabelText('Changer le style de carte en mode Coloré'));
    expect(useMapStore.getState().mapStyleMode).toBe('liberty');
  });

  test('indique le style sélectionné', () => {
    const { getByLabelText } = render(<StyleSelector />);

    expect(
      getByLabelText('Changer le style de carte en mode Sombre').props.accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });
});
