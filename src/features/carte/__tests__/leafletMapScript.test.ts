import { buildLeafletHtml, LeafletMapState, parseLeafletRegion } from '../utils/leafletMap';
import { PlaceItem } from '../types/carte';

/**
 * Exécute le vrai script de la carte Leaflet avec un faux `L`, pour vérifier son comportement
 * (centrage, marqueurs, messages envoyés à l'app) sans navigateur.
 */

interface LatLng {
  lat: number;
  lng: number;
}

type Handler = () => void;

interface FakeMap {
  setView: jest.Mock;
  flyTo: jest.Mock;
  getZoom: () => number;
  getCenter: () => LatLng;
  getBounds: () => { getNorthEast: () => LatLng };
  distance: (a: LatLng, b: LatLng) => number;
  on: (event: string, handler: Handler) => FakeMap;
}

const makePlace = (id: string, latitude: number, longitude: number): PlaceItem => ({
  id,
  title: `Lieu ${id}`,
  category: 'resto',
  latitude,
  longitude,
  address: '1 rue du Test',
  rating: 4,
  reviewsCount: 1,
});

const baseState: LeafletMapState = {
  places: [],
  selectedPlaceId: null,
  center: { latitude: 46.6, longitude: 1.88, zoomLevel: 6 },
  centerVersion: 0,
  userLocation: null,
};

const loadMap = (state: LeafletMapState) => {
  const handlers: Record<string, Handler[]> = {};
  const view = { center: { lat: 0, lng: 0 } as LatLng, zoom: 0 };
  const map: FakeMap = {
    setView: jest.fn((center: [number, number], zoom: number): FakeMap => {
      view.center = { lat: center[0], lng: center[1] };
      view.zoom = zoom;
      return map;
    }),
    flyTo: jest.fn(),
    getZoom: () => view.zoom,
    getCenter: () => view.center,
    getBounds: () => ({
      getNorthEast: () => ({ lat: view.center.lat + 0.1, lng: view.center.lng + 0.1 }),
    }),
    // Distance factice : 1 degré = 100 km.
    distance: (a: LatLng, b: LatLng) => Math.hypot(a.lat - b.lat, a.lng - b.lng) * 100_000,
    on: (event: string, handler: Handler) => {
      (handlers[event] ??= []).push(handler);
      return map;
    },
  };
  const markers: { latlng: [number, number] }[] = [];
  const layer = () => ({ addTo: () => layer(), clearLayers: jest.fn() });
  const L = {
    map: () => map,
    layerGroup: layer,
    tileLayer: () => ({ addTo: jest.fn() }),
    divIcon: () => ({}),
    marker: (latlng: [number, number]) => {
      markers.push({ latlng });
      return { addTo: () => ({ on: jest.fn() }) };
    },
  };
  const postMessage = jest.fn();
  const listeners: ((event: { source: unknown; data: unknown }) => void)[] = [];
  const parent = {};
  const fakeWindow = {
    ReactNativeWebView: { postMessage },
    parent,
    addEventListener: (_type: string, listener: (event: { source: unknown; data: unknown }) => void) =>
      listeners.push(listener),
  };

  const html = buildLeafletHtml('dark', state);
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const script = inlineScripts[inlineScripts.length - 1];
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function('L', 'window', script)(L, fakeWindow);

  const update = (next: LeafletMapState) =>
    listeners.forEach((listener) =>
      listener({ source: parent, data: JSON.stringify({ type: 'UPDATE_MAP', ...next }) })
    );
  const moveTo = (lat: number, lng: number, zoom: number) => {
    view.center = { lat, lng };
    view.zoom = zoom;
    (handlers.moveend ?? []).forEach((handler) => handler());
  };
  const regions = () =>
    postMessage.mock.calls
      .map(([data]: [string]) => parseLeafletRegion(data))
      .filter((region): region is NonNullable<typeof region> => region !== null);

  return { map, markers, update, moveTo, regions };
};

describe('Carte Leaflet — centrage', () => {
  test('ne recentre pas la carte quand seuls les lieux ou la sélection changent', () => {
    const { map, update } = loadMap(baseState);

    update({ ...baseState, places: [makePlace('a', 43.6, 1.44)] });
    update({ ...baseState, places: [makePlace('a', 43.6, 1.44)], selectedPlaceId: 'a' });

    expect(map.flyTo).not.toHaveBeenCalled();
  });

  test('recentre quand une nouvelle demande de centrage arrive, même vers le même point', () => {
    const { map, update } = loadMap(baseState);
    const toulouse = { latitude: 43.6, longitude: 1.44, zoomLevel: 14 };

    update({ ...baseState, center: toulouse, centerVersion: 1 });
    update({ ...baseState, center: toulouse, centerVersion: 1 });
    expect(map.flyTo).toHaveBeenCalledTimes(1);
    expect(map.flyTo).toHaveBeenLastCalledWith([43.6, 1.44], 14);

    // L'utilisateur reclique sur le même lieu après avoir déplacé la carte.
    update({ ...baseState, center: toulouse, centerVersion: 2 });
    expect(map.flyTo).toHaveBeenCalledTimes(2);
  });
});

describe('Carte Leaflet — zone visible', () => {
  test('signale la zone visible au chargement puis à chaque déplacement', () => {
    const { regions, moveTo } = loadMap(baseState);

    expect(regions()).toEqual([
      expect.objectContaining({ latitude: 46.6, longitude: 1.88, zoomLevel: 6 }),
    ]);

    moveTo(43.6, 1.44, 13);

    const last = regions().at(-1);
    expect(last).toEqual(expect.objectContaining({ latitude: 43.6, longitude: 1.44, zoomLevel: 13 }));
    // Rayon = distance centre → coin nord-est (0.1° en lat et en lng avec la fausse distance).
    expect(last?.radiusM).toBeCloseTo(Math.hypot(0.1, 0.1) * 100_000, -1);
  });

  test('affiche un marqueur par lieu reçu', () => {
    const { markers, update } = loadMap(baseState);

    update({ ...baseState, places: [makePlace('a', 43.6, 1.44), makePlace('b', 43.57, 1.45)] });

    expect(markers.map((m) => m.latlng)).toEqual([
      [43.6, 1.44],
      [43.57, 1.45],
    ]);
  });
});

describe('parseLeafletRegion', () => {
  test('ignore les messages invalides ou incomplets', () => {
    expect(parseLeafletRegion('pas du json')).toBeNull();
    expect(parseLeafletRegion(JSON.stringify({ type: 'SELECT_PLACE', id: 'a' }))).toBeNull();
    expect(
      parseLeafletRegion(JSON.stringify({ type: 'REGION_CHANGE', latitude: 1, longitude: 'x' }))
    ).toBeNull();
    expect(parseLeafletRegion({ type: 'REGION_CHANGE' })).toBeNull();
  });
});
