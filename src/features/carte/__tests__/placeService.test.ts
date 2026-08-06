/**
 * Tests unitaires pour placeService.ts
 *
 * On mock le client Supabase pour tester la logique de normalisation
 * et de gestion d'erreurs sans appel réseau réel.
 */

import { searchPlaces, fetchNearbyPlaces, createCustomPlace, upsertPlace } from '../services/placeService';

// ── Mock Supabase ────────────────────────────────────────────────────────────
const mockRpc = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ── Données de test ──────────────────────────────────────────────────────────
const mockPlaceResult = {
  id: 'place-uuid-1',
  name: 'Brasserie du Port',
  category: 'resto',
  latitude: 48.8566,
  longitude: 2.3522,
  address: '12 Quai de la Loire',
  city: 'Paris',
  rating: 4.2,
  reviews_count: 87,
  price_range: '€€',
  images: [],
  tags: ['terrasse', 'groupe'],
  source: 'custom',
  distance_m: 450,
};

// ── Tests searchPlaces ────────────────────────────────────────────────────────
describe('placeService.searchPlaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne les résultats de la RPC quand succès', async () => {
    mockRpc.mockResolvedValueOnce({ data: [mockPlaceResult], error: null });

    const results = await searchPlaces({ query: 'brasserie', lat: 48.8566, lng: 2.3522 });

    expect(mockRpc).toHaveBeenCalledWith('search_places', {
      query: 'brasserie',
      lat: 48.8566,
      lng: 2.3522,
      radius_m: 2000,
      filter_cat: undefined,
      max_results: 30,
    });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Brasserie du Port');
  });

  test('retourne un tableau vide si data est null', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const results = await searchPlaces({});
    expect(results).toEqual([]);
  });

  test('lance une erreur si la RPC échoue', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Erreur PostGIS' },
    });

    await expect(searchPlaces({})).rejects.toThrow('[placeService] searchPlaces échoué');
  });

  test('passe null pour les paramètres optionnels non fournis', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    await searchPlaces({});

    expect(mockRpc).toHaveBeenCalledWith('search_places', expect.objectContaining({
      query: undefined,
      lat: undefined,
      lng: undefined,
      filter_cat: undefined,
    }));
  });
});

// ── Tests fetchNearbyPlaces ───────────────────────────────────────────────────
describe('placeService.fetchNearbyPlaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('appelle searchPlaces avec les coordonnées et max_results=50', async () => {
    mockRpc.mockResolvedValueOnce({ data: [mockPlaceResult], error: null });

    await fetchNearbyPlaces(48.8566, 2.3522, 1000, 'bar');

    expect(mockRpc).toHaveBeenCalledWith('search_places', expect.objectContaining({
      lat: 48.8566,
      lng: 2.3522,
      radius_m: 1000,
      filter_cat: 'bar',
      max_results: 50,
    }));
  });
});

// ── Tests createCustomPlace ───────────────────────────────────────────────────
describe('placeService.createCustomPlace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('insère avec source="custom" et retourne l\'id', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'new-uuid' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const id = await createCustomPlace({
      name: 'Bar des Amis',
      category: 'bar',
      latitude: 48.85,
      longitude: 2.35,
      address: '1 Rue de la Paix',
      city: 'Paris',
      street: null,
      postcode: null,
      country_code: 'FR',
      source_id: null,
      source_url: null,
      description: null,
      phone: null,
      website: null,
      opening_hours: null,
      price_range: '€€',
      rating: null,
      reviews_count: 0,
      images: [],
      tags: [],
      metadata: {},
      created_by: 'user-uuid',
      is_public: true,
    });

    expect(mockFrom).toHaveBeenCalledWith('places');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'custom', name: 'Bar des Amis' }),
    );
    expect(id).toBe('new-uuid');
  });

  test('lance une erreur si l\'insertion échoue', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'RLS violation' } });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ insert: mockInsert });

    await expect(
      createCustomPlace({
        name: 'Test', category: 'bar', latitude: 0, longitude: 0,
        address: null, city: null, street: null, postcode: null, country_code: 'FR',
        source_id: null, source_url: null, description: null, phone: null,
        website: null, opening_hours: null, price_range: null, rating: null,
        reviews_count: 0, images: [], tags: [], metadata: {}, created_by: 'u', is_public: true,
      }),
    ).rejects.toThrow('[placeService] createCustomPlace échoué');
  });
});
