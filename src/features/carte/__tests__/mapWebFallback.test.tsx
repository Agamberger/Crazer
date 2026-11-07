import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { PlaceItem } from '../types/carte';

const place: PlaceItem = {
  id: 'place-1',
  title: 'Pizza Mama',
  category: 'resto',
  latitude: 48.8566,
  longitude: 2.3522,
  address: '12 Rue de Rivoli, Paris',
  rating: 4.8,
  reviewsCount: 140,
};

/**
 * Sur le web, `react-native-webview` n'a pas d'implémentation et MapLibre est natif :
 * la carte doit retomber sur Leaflet + OpenStreetMap dans une <iframe>.
 */
describe('MapViewComponent — fallback web', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'web');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('affiche la carte Leaflet dans une iframe, sans WebView ni MapLibre', () => {
    const { UNSAFE_root, queryByTestId } = render(
      <MapViewComponent places={[place]} onSelectPlace={jest.fn()} />
    );

    const iframes = UNSAFE_root.findAll((node) => node.type === 'iframe');
    expect(iframes).toHaveLength(1);
    expect(String(iframes[0].props.srcDoc)).toContain('L.tileLayer(');
    expect(String(iframes[0].props.srcDoc)).toContain('Pizza Mama');
    expect(queryByTestId('leaflet-webview-map')).toBeNull();
    expect(queryByTestId('maplibre-map-view')).toBeNull();
  });
});
