import { useMapStore, INITIAL_PLACES, INITIAL_POIS } from '../store/useMapStore';
import { PlaceItem } from '../types/carte';

const samplePlaces: PlaceItem[] = [
  {
    id: 'place-1',
    title: 'Le Perchoir Marais',
    category: 'bar',
    latitude: 48.8566,
    longitude: 2.3522,
    address: '33 Rue de la Verrerie, 75004 Paris',
    rating: 4.6,
    reviewsCount: 128,
    description: 'Rooftop avec cocktails signature',
    priceRange: '€€€',
  },
  {
    id: 'place-2',
    title: 'BAM Karaoke Box',
    category: 'activite',
    latitude: 48.8689,
    longitude: 2.3421,
    address: "50 Rue d'Aboukir, 75002 Paris",
    rating: 4.8,
    reviewsCount: 240,
    description: 'Boxs privatifs Karaoke',
    priceRange: '€€',
  },
];

describe('useMapStore', () => {
  beforeEach(() => {
    useMapStore.getState().resetFilters();
    useMapStore.setState({
      places: samplePlaces,
      pois: samplePlaces,
      mapStyleMode: 'dark',
      savedWaypoints: [],
      selectedPlaceId: null,
      selectedPoiId: null,
      isLoading: false,
      error: null,
    });
  });

  test('doit initialiser le store avec un tableau vide de lieux', () => {
    expect(INITIAL_PLACES).toEqual([]);
    expect(INITIAL_POIS).toEqual([]);
    expect(useMapStore.getState().selectedCategory).toBe('all');
    expect(useMapStore.getState().mapStyleMode).toBe('dark');
  });

  test('doit filtrer les lieux par catégorie', () => {
    useMapStore.getState().setSelectedCategory('bar');
    const filtered = useMapStore.getState().getFilteredPlaces();

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((p) => p.category === 'bar')).toBe(true);
  });

  test('doit filtrer les lieux par mot-clé de recherche', () => {
    useMapStore.getState().setSearchQuery('Karaoke');
    const filtered = useMapStore.getState().getFilteredPlaces();

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('Karaoke');
  });

  test('doit basculer un waypoint enregistré (bookmark)', () => {
    const samplePlace: PlaceItem = samplePlaces[0];

    useMapStore.getState().toggleSavedWaypoint(samplePlace);
    expect(useMapStore.getState().savedWaypoints).toContainEqual(samplePlace);

    useMapStore.getState().toggleSavedWaypoint(samplePlace);
    expect(useMapStore.getState().savedWaypoints).not.toContainEqual(samplePlace);
  });

  test('doit changer le mode de style de la carte', () => {
    useMapStore.getState().setMapStyleMode('voyager');
    expect(useMapStore.getState().mapStyleMode).toBe('voyager');
  });

  test('doit réinitialiser les filtres', () => {
    useMapStore.getState().setSelectedCategory('resto');
    useMapStore.getState().setSearchQuery('Pizza');
    useMapStore.getState().setSelectedPlaceId('place-3');

    useMapStore.getState().resetFilters();

    const state = useMapStore.getState();
    expect(state.selectedCategory).toBe('all');
    expect(state.searchQuery).toBe('');
    expect(state.selectedPlaceId).toBeNull();
  });

  // ── Nouveaux états asynchrones ────────────────────────────────────────────

  test('setPlaces — remplace la liste des lieux', () => {
    const newPlace: PlaceItem = {
      id: 'custom-1',
      title: 'Bar Test Supabase',
      category: 'bar',
      latitude: 48.86,
      longitude: 2.35,
      address: '1 Rue Test',
      rating: 4.0,
      reviewsCount: 10,
      description: 'Un bar test',
      priceRange: '€',
    };

    useMapStore.getState().setPlaces([newPlace]);

    expect(useMapStore.getState().places).toEqual([newPlace]);
  });

  test('setIsLoading — met à jour l’état de chargement', () => {
    expect(useMapStore.getState().isLoading).toBe(false);

    useMapStore.getState().setIsLoading(true);
    expect(useMapStore.getState().isLoading).toBe(true);

    useMapStore.getState().setIsLoading(false);
    expect(useMapStore.getState().isLoading).toBe(false);
  });

  test('setError — stocke et efface un message d’erreur', () => {
    expect(useMapStore.getState().error).toBeNull();

    useMapStore.getState().setError('Erreur de connexion Supabase');
    expect(useMapStore.getState().error).toBe('Erreur de connexion Supabase');

    useMapStore.getState().setError(null);
    expect(useMapStore.getState().error).toBeNull();
  });
});
