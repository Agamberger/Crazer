import React from 'react';
import { Platform } from 'react-native';
import { act, render } from '@testing-library/react-native';
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

  const mountWithFrame = (onRegionChange: jest.Mock) => {
    const frameWindow = { postMessage: jest.fn() };
    let messageHandler: (event: { source: unknown; data: unknown }) => void = () => undefined;
    // L'environnement de test n'a pas d'API d'événements DOM sur `window`.
    Object.assign(window, {
      addEventListener: (type: string, handler: typeof messageHandler) => {
        if (type === 'message') messageHandler = handler;
      },
      removeEventListener: () => undefined,
    });
    const utils = render(
      <MapViewComponent places={[place]} onSelectPlace={jest.fn()} onRegionChange={onRegionChange} />,
      {
        createNodeMock: (element) =>
          element.type === 'iframe' ? { contentWindow: frameWindow } : null,
      }
    );
    const send = (source: unknown, data: unknown) => act(() => messageHandler({ source, data }));
    return { ...utils, frameWindow, send };
  };

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
  test('transmet la zone visible envoyée par la carte, et seulement par elle', () => {
    const onRegionChange = jest.fn();
    const { frameWindow, send } = mountWithFrame(onRegionChange);
    const region = { type: 'REGION_CHANGE', latitude: 43.6, longitude: 1.44, zoomLevel: 13, radiusM: 3500 };

    send({}, JSON.stringify(region));
    expect(onRegionChange).not.toHaveBeenCalled();

    send(frameWindow, JSON.stringify(region));
    expect(onRegionChange).toHaveBeenCalledWith({
      latitude: 43.6,
      longitude: 1.44,
      zoomLevel: 13,
      radiusM: 3500,
    });
  });

  test('ne recharge pas la carte quand les lieux changent : ils passent par postMessage', () => {
    const { UNSAFE_root, rerender, frameWindow } = mountWithFrame(jest.fn());
    const srcDoc = () => UNSAFE_root.findAll((node) => node.type === 'iframe')[0].props.srcDoc;
    const before = srcDoc();

    rerender(
      <MapViewComponent
        places={[place, { ...place, id: 'place-2', title: 'Chez Toulouse', latitude: 43.6, longitude: 1.44 }]}
        onSelectPlace={jest.fn()}
      />
    );

    expect(srcDoc()).toBe(before);
    expect(String(frameWindow.postMessage.mock.calls.at(-1)?.[0])).toContain('Chez Toulouse');
  });
});
