import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NativeMapLibreView } from '../components/NativeMapLibreView';
import { MapRegion, PlaceItem } from '../types/carte';

const center: MapRegion = { latitude: 48.85, longitude: 2.35, zoomLevel: 12 };

const places: PlaceItem[] = [
  {
    id: 'p1',
    title: 'Le Bar',
    category: 'bar',
    latitude: 48.86,
    longitude: 2.34,
    address: 'Paris',
    rating: 0,
    reviewsCount: 0,
  },
  {
    id: 'p2',
    title: 'Le Resto',
    category: 'resto',
    latitude: 48.87,
    longitude: 2.33,
    address: 'Paris',
    rating: 0,
    reviewsCount: 0,
  },
];

const renderMap = (props: Partial<React.ComponentProps<typeof NativeMapLibreView>> = {}) =>
  render(
    <NativeMapLibreView
      styleURL="https://example.com/style.json"
      center={center}
      userLocation={null}
      places={places}
      selectedPlaceId={null}
      onSelectPlace={jest.fn()}
      {...props}
    />,
  );

describe('NativeMapLibreView', () => {
  it('passes the style URL and centres the camera on the region', () => {
    const { getByTestId } = renderMap();

    expect(getByTestId('maplibre-map-view').props.styleURL).toBe('https://example.com/style.json');
    const camera = getByTestId('maplibre-camera');
    expect(camera.props.centerCoordinate).toEqual([2.35, 48.85]);
    expect(camera.props.zoomLevel).toBe(12);
  });

  it('renders one marker per place and forwards the selected place', () => {
    const onSelectPlace = jest.fn();
    const { getByLabelText, queryByLabelText } = renderMap({ onSelectPlace });

    expect(queryByLabelText('Votre position')).toBeNull();
    fireEvent.press(getByLabelText('Sélectionner Le Resto'));
    expect(onSelectPlace).toHaveBeenCalledWith(places[1]);
  });

  it('shows the user position when it is known', () => {
    const { getByLabelText } = renderMap({ userLocation: { latitude: 48.8, longitude: 2.3 } });

    expect(getByLabelText('Votre position')).toBeTruthy();
  });
});
