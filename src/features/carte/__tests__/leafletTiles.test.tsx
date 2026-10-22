import React from 'react';
import { render } from '@testing-library/react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { useMapStore } from '../store/useMapStore';
import { MapStyleMode } from '../types/carte';

// Simule Expo Go : le module natif MapLibre est indisponible, le composant bascule sur Leaflet.
jest.mock('@maplibre/maplibre-react-native', () => {
  throw new Error('Module natif indisponible');
});

jest.mock('react-native-webview', () => {
  const { forwardRef, useImperativeHandle, createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const WebView = forwardRef((props: Record<string, unknown>, ref: unknown) => {
    useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn() }));
    return createElement(View, { testID: 'leaflet-webview', ...props });
  });
  WebView.displayName = 'WebViewMock';
  return { WebView };
});

/**
 * Le fallback Leaflet (Expo Go / web) ne doit utiliser que des tuiles raster sans clé API :
 * CARTO renvoie l'image "API KEY REQUIRED" pour tous ses chemins de tuiles raster.
 */
describe('MapViewComponent — tuiles Leaflet', () => {
  const modes: MapStyleMode[] = ['dark', 'voyager', 'outdoor'];

  const renderHtml = (mode: MapStyleMode): string => {
    useMapStore.getState().setMapStyleMode(mode);
    const { getByTestId } = render(<MapViewComponent pois={[]} onSelectPoi={jest.fn()} />);
    return (getByTestId('leaflet-webview').props.source as { html: string }).html;
  };

  test.each(modes)("n'utilise aucune tuile raster CARTO (mode %s)", (mode) => {
    expect(renderHtml(mode)).not.toMatch(/L\.tileLayer\('[^']*cartocdn/);
  });

  test('applique un filtre sombre sur les tuiles pour le style dark', () => {
    expect(renderHtml('dark')).toContain('.leaflet-tile-pane { filter: invert(1)');
  });

  test.each<MapStyleMode>(['voyager', 'outdoor'])(
    "n'applique pas de filtre sombre pour le style %s",
    (mode) => {
      expect(renderHtml(mode)).not.toContain('.leaflet-tile-pane { filter');
    }
  );
});
