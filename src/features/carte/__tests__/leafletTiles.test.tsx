import React from 'react';
import { render } from '@testing-library/react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { MAP_ATTRIBUTION_HTML, MAP_STYLE_URLS } from '../constants';
import { useMapStore } from '../store/useMapStore';
import { MapStyleMode } from '../types/carte';

// Simulates Expo Go: the native MapLibre module is unavailable, the component falls back to Leaflet.
jest.mock('@maplibre/maplibre-react-native', () => {
  throw new Error('Module natif indisponible');
});

const MODES: MapStyleMode[] = ['dark', 'liberty', 'positron'];

describe('MAP_STYLE_URLS', () => {
  test.each(MODES)('pointe le style %s vers OpenFreeMap', (mode) => {
    expect(MAP_STYLE_URLS[mode]).toBe(`https://tiles.openfreemap.org/styles/${mode}`);
  });

  test("n'utilise plus aucun style CARTO", () => {
    Object.values(MAP_STYLE_URLS).forEach((url) => expect(url).not.toContain('cartocdn'));
  });

  test("contient l'attribution exigée par OpenFreeMap", () => {
    expect(MAP_ATTRIBUTION_HTML).toContain('© OpenFreeMap');
    expect(MAP_ATTRIBUTION_HTML).toContain('© OpenMapTiles');
    expect(MAP_ATTRIBUTION_HTML).toContain('Data from');
    expect(MAP_ATTRIBUTION_HTML).toContain('https://www.openstreetmap.org/copyright');
  });
});

/** The Leaflet fallback (Expo Go / web) draws the same OpenFreeMap vector style as native. */
describe('MapViewComponent — fond de carte Leaflet', () => {
  const renderHtml = (mode: MapStyleMode): string => {
    useMapStore.getState().setMapStyleMode(mode);
    const { getByTestId } = render(<MapViewComponent places={[]} onSelectPlace={jest.fn()} />);
    return (getByTestId('leaflet-webview-map').props.source as { html: string }).html;
  };

  test.each(MODES)('charge le style vectoriel OpenFreeMap %s', (mode) => {
    const html = renderHtml(mode);
    expect(html).toContain(`"style":"https://tiles.openfreemap.org/styles/${mode}"`);
    expect(html).toContain('L.maplibreGL(');
  });

  test.each(MODES)("n'utilise ni tuiles raster ni CARTO (mode %s)", (mode) => {
    const html = renderHtml(mode);
    expect(html).not.toContain('L.tileLayer(');
    expect(html).not.toContain('cartocdn');
  });

  test("n'inverse plus les couleurs des tuiles pour le style sombre", () => {
    expect(renderHtml('dark')).not.toContain('filter: invert(1)');
  });

  test("affiche l'attribution OpenFreeMap", () => {
    expect(renderHtml('positron')).toContain('OpenFreeMap');
  });
});
