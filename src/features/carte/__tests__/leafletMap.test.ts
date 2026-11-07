import {
  buildLeafletHtml,
  buildLeafletUpdateScript,
  LeafletMapState,
  parseLeafletSelection,
  serializeForScript,
} from '../utils/leafletMap';
import { PlaceItem } from '../types/carte';

const maliciousPlace: PlaceItem = {
  id: 'evil',
  title: '</script><script>window.pwned = true</script>',
  category: 'bar',
  latitude: 48.85,
  longitude: 2.35,
  address: '1 rue du Test',
  rating: 4,
  reviewsCount: 1,
};

const state: LeafletMapState = {
  places: [maliciousPlace],
  selectedPlaceId: null,
  center: { latitude: 48.85, longitude: 2.35, zoomLevel: 13 },
  userLocation: null,
};

describe('serializeForScript', () => {
  test('échappe les chevrons pour ne jamais fermer la balise <script>', () => {
    const serialized = serializeForScript({ title: '</script><b>' });
    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual({ title: '</script><b>' });
  });

  test('échappe les séparateurs de ligne Unicode U+2028 / U+2029', () => {
    const serialized = serializeForScript('a\u2028b\u2029c');
    expect(serialized).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(serialized)).toBe('a\u2028b\u2029c');
  });
});

describe('buildLeafletHtml', () => {
  test("n'injecte pas de balise <script> venant du nom d'un lieu", () => {
    const html = buildLeafletHtml('dark', state);
    expect(html).not.toContain('<script>window.pwned');
    // Seules les deux balises du template (leaflet.js + script inline) existent.
    expect(html.match(/<\/script>/g)).toHaveLength(2);
  });

  test("relaie les clics vers la page parente quand il n'y a pas de WebView native (web)", () => {
    const html = buildLeafletHtml('voyager', state);
    expect(html).toContain('window.ReactNativeWebView');
    expect(html).toContain('window.parent.postMessage');
  });

  test('accepte les mises à jour envoyées par la page parente (web)', () => {
    const html = buildLeafletHtml('voyager', state);
    expect(html).toContain("addEventListener('message'");
    expect(html).toContain('UPDATE_MAP');
  });
});

describe('buildLeafletUpdateScript', () => {
  test('échappe aussi les données injectées dans la WebView', () => {
    expect(buildLeafletUpdateScript(state)).not.toContain('</script>');
  });
});

describe('parseLeafletSelection', () => {
  test("retourne l'id du lieu sélectionné", () => {
    expect(parseLeafletSelection(JSON.stringify({ type: 'SELECT_PLACE', id: 'p1' }))).toBe('p1');
    expect(parseLeafletSelection(JSON.stringify({ type: 'SELECT_POI', id: 'p2' }))).toBe('p2');
  });

  test('ignore les messages invalides ou étrangers', () => {
    expect(parseLeafletSelection('pas du json')).toBeNull();
    expect(parseLeafletSelection(JSON.stringify({ type: 'AUTRE', id: 'x' }))).toBeNull();
    expect(parseLeafletSelection(JSON.stringify({ type: 'SELECT_PLACE', id: 42 }))).toBeNull();
    expect(parseLeafletSelection({ type: 'SELECT_PLACE', id: 'objet' })).toBeNull();
  });
});
