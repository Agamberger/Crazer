import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NativePlaceMarker } from '../components/NativePlaceMarker';
import { CATEGORY_EMOJIS } from '../utils/leafletMap';
import { PlaceItem } from '../types/carte';

const place: PlaceItem = {
  id: 'p1',
  title: 'Le Bar',
  category: 'bar',
  latitude: 48.86,
  longitude: 2.34,
  address: 'Paris',
  rating: 0,
  reviewsCount: 0,
};

describe('NativePlaceMarker', () => {
  it('places the marker at the place coordinates with its category emoji', () => {
    const { getByTestId, getByText, queryByText } = render(
      <NativePlaceMarker place={place} isSelected={false} onSelect={jest.fn()} />,
    );

    expect(getByTestId('maplibre-marker-view').props.coordinate).toEqual([2.34, 48.86]);
    expect(getByText(CATEGORY_EMOJIS.bar)).toBeTruthy();
    expect(queryByText('Le Bar')).toBeNull();
  });

  it('shows the place name when selected', () => {
    const { getByText } = render(
      <NativePlaceMarker place={place} isSelected onSelect={jest.fn()} />,
    );

    expect(getByText('Le Bar')).toBeTruthy();
  });

  it('calls onSelect with the place when pressed', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <NativePlaceMarker place={place} isSelected={false} onSelect={onSelect} />,
    );

    fireEvent.press(getByLabelText('Sélectionner Le Bar'));
    expect(onSelect).toHaveBeenCalledWith(place);
  });
});
