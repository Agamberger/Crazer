import React from 'react';
import { render } from '@testing-library/react-native';
import { UserLocationMarker } from '../components/UserLocationMarker';

describe('UserLocationMarker', () => {
  it('renders an accessible marker at the user position', () => {
    const { getByTestId, getByLabelText } = render(
      <UserLocationMarker location={{ latitude: 45.76, longitude: 4.83 }} />,
    );

    expect(getByTestId('maplibre-marker-view').props.coordinate).toEqual([4.83, 45.76]);
    expect(getByLabelText('Votre position').props.accessibilityRole).toBe('image');
  });
});
