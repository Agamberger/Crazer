import { useMapStore, INITIAL_POIS } from '../store/useMapStore';
import { PoiItem } from '../types/carte';

describe('useMapStore', () => {
  beforeEach(() => {
    useMapStore.getState().resetFilters();
    useMapStore.setState({
      mapStyleMode: 'dark',
      savedWaypoints: [],
      selectedPoiId: null,
    });
  });

  test('doit initialiser le store avec les POIs par défaut', () => {
    const state = useMapStore.getState();
    expect(state.pois).toEqual(INITIAL_POIS);
    expect(state.selectedCategory).toBe('all');
    expect(state.mapStyleMode).toBe('dark');
  });

  test('doit filtrer les POIs par catégorie', () => {
    useMapStore.getState().setSelectedCategory('bar');
    const filtered = useMapStore.getState().getFilteredPois();

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((p) => p.category === 'bar')).toBe(true);
  });

  test('doit filtrer les POIs par mot-clé de recherche', () => {
    useMapStore.getState().setSearchQuery('Karaoke');
    const filtered = useMapStore.getState().getFilteredPois();

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('Karaoke');
  });

  test('doit basculer un waypoint enregistré (bookmark)', () => {
    const samplePoi: PoiItem = INITIAL_POIS[0];

    useMapStore.getState().toggleSavedWaypoint(samplePoi);
    expect(useMapStore.getState().savedWaypoints).toContainEqual(samplePoi);

    useMapStore.getState().toggleSavedWaypoint(samplePoi);
    expect(useMapStore.getState().savedWaypoints).not.toContainEqual(samplePoi);
  });

  test('doit changer le mode de style de la carte', () => {
    useMapStore.getState().setMapStyleMode('voyager');
    expect(useMapStore.getState().mapStyleMode).toBe('voyager');
  });

  test('doit réinitialiser les filtres', () => {
    useMapStore.getState().setSelectedCategory('resto');
    useMapStore.getState().setSearchQuery('Pizza');
    useMapStore.getState().setSelectedPoiId('poi-3');

    useMapStore.getState().resetFilters();

    const state = useMapStore.getState();
    expect(state.selectedCategory).toBe('all');
    expect(state.searchQuery).toBe('');
    expect(state.selectedPoiId).toBeNull();
  });
});
