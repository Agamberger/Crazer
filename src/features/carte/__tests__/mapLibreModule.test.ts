import { View } from 'react-native';

type MapLibreModule = typeof import('../utils/mapLibreModule');

const loadModule = (): MapLibreModule => {
  let loaded: MapLibreModule | undefined;
  jest.isolateModules(() => {
    loaded = require('../utils/mapLibreModule');
  });
  if (!loaded) throw new Error('mapLibreModule not loaded');
  return loaded;
};

describe('mapLibreModule', () => {
  afterEach(() => {
    jest.dontMock('@maplibre/maplibre-react-native');
  });

  it('resolves the native components when MapLibre is installed (jest.setup mock)', () => {
    const mapLibre = loadModule();

    expect(mapLibre.isMapLibreAvailable).toBe(true);
    expect(mapLibre.MapLibreMap).not.toBe(View);
    expect(mapLibre.MapLibreCamera).not.toBe(View);
    expect(mapLibre.MapLibreMarker).not.toBe(View);
  });

  it('falls back to View when the native module is missing (Expo Go)', () => {
    jest.doMock('@maplibre/maplibre-react-native', () => {
      throw new Error('Module natif indisponible');
    });

    const mapLibre = loadModule();

    expect(mapLibre.isMapLibreAvailable).toBe(false);
    expect(mapLibre.MapLibreMap).toBe(View);
    expect(mapLibre.MapLibreCamera).toBe(View);
    expect(mapLibre.MapLibreMarker).toBe(View);
  });
});
