import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PlaceDetailHeader, PlaceDetailHeaderProps } from '../components/PlaceDetailHeader';
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
  priceRange: '€€',
};

const renderHeader = (props: Partial<PlaceDetailHeaderProps> = {}) =>
  render(
    <PlaceDetailHeader
      place={place}
      isExpanded={false}
      isSaved={false}
      onToggleExpand={jest.fn()}
      onToggleSaved={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />,
  );

describe('PlaceDetailHeader', () => {
  it('shows the category, the price and no open status when unknown', () => {
    const { getByText, queryByText } = renderHeader();

    expect(getByText('Bar & Lounge')).toBeTruthy();
    expect(getByText('€€')).toBeTruthy();
    expect(queryByText('🟢 Ouvert')).toBeNull();
    expect(queryByText('🔴 Fermé')).toBeNull();
  });

  it('shows the open / closed status', () => {
    expect(
      renderHeader({ place: { ...place, isOpenNow: true } }).getByText('🟢 Ouvert'),
    ).toBeTruthy();
    expect(
      renderHeader({ place: { ...place, isOpenNow: false } }).getByText('🔴 Fermé'),
    ).toBeTruthy();
  });

  it('wires the expand, save and close buttons', () => {
    const onToggleExpand = jest.fn();
    const onToggleSaved = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderHeader({ onToggleExpand, onToggleSaved, onClose });

    fireEvent.press(getByTestId('expand-button'));
    fireEvent.press(getByTestId('bookmark-button'));
    fireEvent.press(getByTestId('close-button'));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(onToggleSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('labels the buttons according to the expanded and saved states', () => {
    const { getByLabelText } = renderHeader({ isExpanded: true, isSaved: true });

    expect(getByLabelText('Réduire')).toBeTruthy();
    expect(getByLabelText('Retirer des enregistrés')).toBeTruthy();
  });
});
