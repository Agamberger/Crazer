import {
  PlaceSearchResult,
  PlaceItem,
  parseAddressComponents,
  placeItemToCreatePlaceDto,
} from '../types/carte';
import {
  ensurePlaceExists,
  fetchNearbyPlaces,
  searchPlaces,
  upsertPlace,
} from '../services/placeService';

// ── Mock Supabase ────────────────────────────────────────────────────────────
const mockRpc = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user-id' } }, error: null }),
    },
  },
}));

const mockPlaceResult: PlaceSearchResult = {
  id: 'place-1',
  name: 'Brasserie du Port',
  category: 'resto',
  latitude: 48.8566,
  longitude: 2.3522,
  address: '1 Quai de la Tournelle, 75005 Paris',
  street: '1 Quai de la Tournelle',
  city: 'Paris',
  postcode: '75005',
  country_code: 'FR',
  source: 'osm',
  source_id: 'node/12345',
  source_url: null,
  description: 'Brasserie conviviale',
  phone: '+33 1 23 45 67 89',
  website: 'https://brasserieduport.fr',
  opening_hours: 'Mo-Su 11:00-23:00',
  price_range: '€€',
  rating: 4.2,
  reviews_count: 85,
  images: ['https://example.com/photo.jpg'],
  tags: ['terrasse', 'vue-sur-seine'],
  metadata: { osm_type: 'node' },
  created_by: null,
  is_public: true,
  created_at: '2026-08-01T12:00:00Z',
  updated_at: '2026-08-01T12:00:00Z',
  distance_m: 250,
};

// ── Tests parseAddressComponents & placeItemToCreatePlaceDto ─────────────────
describe('placeService - Helper parsing & DTO enrichment', () => {
  test('parseAddressComponents extrait rue, code postal, ville et pays', () => {
    const res = parseAddressComponents('12 Rue de Rivoli, 75004 Paris, France');
    expect(res.street).toBe('12 Rue de Rivoli');
    expect(res.postcode).toBe('75004');
    expect(res.city).toBe('Paris');
    expect(res.country_code).toBe('FR');
  });

  test('parseAddressComponents gère les adresses courtes sans code postal', () => {
    const res = parseAddressComponents('Montmartre, Paris');
    expect(res.street).toBe('Montmartre');
    expect(res.city).toBe('Paris');
    expect(res.country_code).toBe('FR');
  });

  test('parseAddressComponents gère les adresses vides ou non spécifiées', () => {
    const res = parseAddressComponents('Adresse non spécifiée');
    expect(res.street).toBeNull();
    expect(res.city).toBeNull();
    expect(res.postcode).toBeNull();
  });

  test('placeItemToCreatePlaceDto mappe tous les champs SQL enrichis', () => {
    const place: PlaceItem = {
      id: 'google-ChIJ123456789',
      title: 'Le Grand Véfour',
      category: 'resto',
      latitude: 48.866,
      longitude: 2.337,
      address: '17 Rue de Beaujolais, 75001 Paris, France',
      rating: 4.8,
      reviewsCount: 1540,
      description: 'Gastronomie historique',
      priceRange: '€€€€',
      imageUrl: 'https://img.com/1.jpg',
      images: ['https://img.com/1.jpg', 'https://img.com/2.jpg'],
      openingHours: ['Lundi: 12:00 - 14:00', 'Mardi: 12:00 - 14:00'],
      isOpenNow: true,
      phone: '+33 1 42 96 56 27',
      website: 'https://grand-vefour.com',
    };

    const dto = placeItemToCreatePlaceDto(place, 'user-uuid-123');

    expect(dto.name).toBe('Le Grand Véfour');
    expect(dto.category).toBe('resto');
    expect(dto.source).toBe('google');
    expect(dto.source_id).toBe('ChIJ123456789');
    expect(dto.street).toBe('17 Rue de Beaujolais');
    expect(dto.postcode).toBe('75001');
    expect(dto.city).toBe('Paris');
    expect(dto.phone).toBe('+33 1 42 96 56 27');
    expect(dto.website).toBe('https://grand-vefour.com');
    expect(dto.opening_hours).toContain('Lundi: 12:00 - 14:00');
    expect(dto.rating).toBe(4.8);
    expect(dto.reviews_count).toBe(1540);
    expect(dto.images).toHaveLength(2);
    expect(dto.tags).toContain('resto');
    expect(dto.tags).toContain('ouvert');
    expect(dto.metadata).toEqual(expect.objectContaining({ isOpenNow: true, originalPlaceId: 'google-ChIJ123456789' }));
    expect(dto.created_by).toBe('user-uuid-123');
  });
});

// ── Tests searchPlaces ───────────────────────────────────────────────────────
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
      max_results: 20,
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

    await expect(searchPlaces({})).rejects.toThrow('Erreur PostGIS');
  });
});

// ── Tests fetchNearbyPlaces ──────────────────────────────────────────────────
describe('placeService.fetchNearbyPlaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('appelle searchPlaces avec les coordonnées et les valeurs par défaut', async () => {
    mockRpc.mockResolvedValueOnce({ data: [mockPlaceResult], error: null });

    const results = await fetchNearbyPlaces(48.8566, 2.3522, 1500, 'bar');

    expect(mockRpc).toHaveBeenCalledWith('search_places', {
      query: undefined,
      lat: 48.8566,
      lng: 2.3522,
      radius_m: 1500,
      filter_cat: 'bar',
      max_results: 20,
    });
    expect(results).toEqual([mockPlaceResult]);
  });
});

// ── Tests upsertPlace ────────────────────────────────────────────────────────
describe('placeService.upsertPlace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('met à jour un lieu existant trouvé par source_id', async () => {
    const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-uuid-1' } }),
          }),
        }),
      }),
      update: mockUpdate,
    });

    const placeId = await upsertPlace({
      name: 'Lieu Mis à jour',
      category: 'bar',
      latitude: 48.85,
      longitude: 2.35,
      address: '1 rue test',
      street: '1 rue test',
      city: 'Paris',
      postcode: '75000',
      country_code: 'FR',
      source: 'osm',
      source_id: 'node/99999',
      source_url: null,
      description: 'Nouveau',
      phone: null,
      website: null,
      opening_hours: null,
      price_range: null,
      rating: 4.5,
      images: [],
      tags: [],
      metadata: {},
      created_by: null,
      is_public: true,
    });

    expect(placeId).toBe('existing-uuid-1');
  });

  test('insère un nouveau lieu si aucun doublon n’est trouvé', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'places') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
            ilike: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'new-place-uuid' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const placeId = await upsertPlace({
      name: 'Nouveau Bar Inconnu',
      category: 'bar',
      latitude: 48.85,
      longitude: 2.35,
      address: '2 rue test',
      street: '2 rue test',
      city: 'Paris',
      postcode: '75000',
      country_code: 'FR',
      source: 'custom',
      source_id: null,
      source_url: null,
      description: null,
      phone: null,
      website: null,
      opening_hours: null,
      price_range: null,
      rating: null,
      images: [],
      tags: [],
      metadata: {},
      created_by: 'user-1',
      is_public: true,
    });

    expect(placeId).toBe('new-place-uuid');
  });
});

// ── Tests ensurePlaceExists ──────────────────────────────────────────────────
describe('placeService.ensurePlaceExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne l’ID tel quel si le lieu a un vrai UUID Supabase existant en base', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' } }),
        }),
      }),
    });

    const place: PlaceItem = {
      id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      title: 'Lieu Existant',
      category: 'resto',
      latitude: 48.85,
      longitude: 2.35,
      address: '1 rue test',
      rating: 4.0,
      reviewsCount: 10,
    };

    const id = await ensurePlaceExists(place, 'user-1');
    expect(id).toBe('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
  });

  test('crée un lieu si c’est un POI externe (ex: osm-12345)', async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
        ilike: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 'created-from-osm-uuid' }, error: null }),
        }),
      }),
    });

    const place: PlaceItem = {
      id: 'osm-12345',
      title: 'Monument OSM',
      category: 'culture',
      latitude: 48.85,
      longitude: 2.35,
      address: '1 rue test',
      rating: 4.5,
      reviewsCount: 5,
    };

    const id = await ensurePlaceExists(place, 'user-1');
    expect(id).toBe('created-from-osm-uuid');
  });
});
