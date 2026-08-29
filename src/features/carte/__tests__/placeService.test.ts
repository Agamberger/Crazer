import {
  PlaceSearchResult,
  PlaceItem,
  parseAddressComponents,
  placeItemToCreatePlaceDto,
} from '../types/carte';
import {
  createCustomPlace,
  ensurePlaceExists,
  fetchNearbyPlaces,
  searchPlaces,
  upsertPlace,
} from '../services/placeService';

// ── Mock Supabase ─────────────────────────────────────────────
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockIlike = jest.fn();

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
      search_query: 'brasserie',
      center_lat: 48.8566,
      center_lng: 2.3522,
      radius_meters: 2000,
      filter_category: null,
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

  test('appelle searchPlaces avec les coordonnées et filtres', async () => {
    mockRpc.mockResolvedValueOnce({ data: [mockPlaceResult], error: null });

    const results = await fetchNearbyPlaces(48.8566, 2.3522, 1000, 'bar');

    expect(results).toHaveLength(1);
    expect(mockRpc).toHaveBeenCalledWith('search_places', expect.objectContaining({
      center_lat: 48.8566,
      center_lng: 2.3522,
      radius_meters: 1000,
      filter_category: 'bar',
      max_results: 20,
    }));
  });
});

// ── Tests createCustomPlace & upsertPlace ─────────────────────────────────────
describe('placeService.createCustomPlace & upsertPlace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createCustomPlace insère avec source="custom" et location Point et retourne l\'id', async () => {
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
      street: '1 Rue de la Paix',
      postcode: '75001',
      country_code: 'FR',
      source: 'custom',
      source_id: null,
      source_url: null,
      description: 'Super ambiance',
      phone: '+33123456789',
      website: 'https://bardesamis.fr',
      opening_hours: '18:00 - 02:00',
      price_range: '€€',
      rating: 4.5,
      reviews_count: 12,
      images: ['https://img.com/bar.jpg'],
      tags: ['bar', 'ambiance'],
      metadata: { tag: 'cool' },
      created_by: 'user-uuid',
      is_public: true,
    });

    expect(mockFrom).toHaveBeenCalledWith('places');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'custom',
        name: 'Bar des Amis',
        location: 'POINT(2.35 48.85)',
        phone: '+33123456789',
        website: 'https://bardesamis.fr',
        street: '1 Rue de la Paix',
        postcode: '75001',
      }),
    );
    expect(id).toBe('new-uuid');
  });

  test('upsertPlace utilise onConflict source,source_id et location Point', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'upserted-uuid' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const id = await upsertPlace({
      name: 'Place Google',
      category: 'resto',
      latitude: 48.85,
      longitude: 2.35,
      address: '10 Rue de la Paix',
      city: 'Paris',
      street: '10 Rue de la Paix',
      postcode: '75002',
      country_code: 'FR',
      source: 'google',
      source_id: 'ChIJ123',
      source_url: null,
      description: null,
      phone: null,
      website: null,
      opening_hours: null,
      price_range: null,
      rating: null,
      reviews_count: 0,
      images: [],
      tags: [],
      metadata: {},
      created_by: 'user-1',
      is_public: true,
    });

    expect(mockFrom).toHaveBeenCalledWith('places');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'google',
        source_id: 'ChIJ123',
        location: 'POINT(2.35 48.85)',
      }),
      { onConflict: 'source,source_id', ignoreDuplicates: false },
    );
    expect(id).toBe('upserted-uuid');
  });
});

// ── Tests ensurePlaceExists ──────────────────────────────────────────────────
describe('placeService.ensurePlaceExists', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('retourne l\'id existant sans création si le lieu a un UUID valide déjà en base', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: validUuid }, error: null });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      upsert: mockUpsert,
    });

    const place: PlaceItem = {
      id: validUuid,
      title: 'Mon Super Bar',
      category: 'bar',
      latitude: 48.85,
      longitude: 2.35,
      address: 'Paris',
      rating: 4.5,
      reviewsCount: 10,
      description: '',
      priceRange: '',
    };

    const result = await ensurePlaceExists(place, 'user-1');
    expect(result).toBe(validUuid);
    expect(mockFrom).toHaveBeenCalledWith('places');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test('retourne l\'id existant sans création si le provider externe (Google) existe déjà', async () => {
    const existingId = 'existing-google-place-uuid';
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: existingId }, error: null });
    const mockEq2 = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: mockEq1 }),
      insert: mockInsert,
      upsert: mockUpsert,
    });

    const place: PlaceItem = {
      id: 'google-ChIJExisting',
      title: 'Le Loup Bar',
      category: 'bar',
      latitude: 48.86,
      longitude: 2.34,
      address: '44 Rue du Louvre, 75001 Paris',
      rating: 4.3,
      reviewsCount: 200,
      description: '',
      priceRange: '',
    };

    const result = await ensurePlaceExists(place, 'user-1');
    expect(result).toBe(existingId);
    expect(mockEq1).toHaveBeenCalledWith('source', 'google');
    expect(mockEq2).toHaveBeenCalledWith('source_id', 'ChIJExisting');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test('upsert le lieu avec toutes les métadonnées si le lieu Google n\'existe pas encore', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'created-google-uuid' }, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpsert.mockReturnValue({ select: mockSelect });

    // 1st call to check if source/source_id exists (returns null -> not existing)
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const mockEq2 = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: mockEq1 }),
      upsert: mockUpsert,
    });

    const place: PlaceItem = {
      id: 'google-ChIJ456789',
      title: 'Café de Flore',
      category: 'bar',
      latitude: 48.854,
      longitude: 2.332,
      address: '172 Boulevard Saint-Germain, 75006 Paris, France',
      rating: 4.6,
      reviewsCount: 3200,
      description: 'Café emblématique',
      priceRange: '€€€',
      phone: '+33 1 45 48 55 26',
      website: 'https://cafedeflore.fr',
      openingHours: ['07:30 - 01:30'],
      isOpenNow: true,
      imageUrl: 'https://img.com/flore.jpg',
    };

    const result = await ensurePlaceExists(place, 'user-1');
    expect(result).toBe('created-google-uuid');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Café de Flore',
        location: 'POINT(2.332 48.854)',
        source: 'google',
        source_id: 'ChIJ456789',
        street: '172 Boulevard Saint-Germain',
        postcode: '75006',
        city: 'Paris',
        phone: '+33 1 45 48 55 26',
        website: 'https://cafedeflore.fr',
        opening_hours: '07:30 - 01:30',
        rating: 4.6,
        reviews_count: 3200,
      }),
      expect.anything(),
    );
  });

  test('retourne l\'id existant d\'un lieu custom ayant le même nom et la même adresse', async () => {
    const existingCustomId = 'existing-custom-place-uuid';
    // 1st call for source/source_id check (returns null)
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // 2nd call for name/address check (returns existing place)
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: existingCustomId }, error: null });

    mockIlike.mockReturnValue({ ilike: mockIlike, maybeSingle: mockMaybeSingle });
    const mockEqSource2 = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEqSource1 = jest.fn().mockReturnValue({ eq: mockEqSource2 });

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: mockEqSource1,
        ilike: mockIlike,
      }),
      insert: mockInsert,
    });

    const place: PlaceItem = {
      id: 'custom-place-123',
      title: 'Pizzeria Chez Luigi',
      category: 'resto',
      latitude: 48.87,
      longitude: 2.31,
      address: '5 Rue de Rome, 75008 Paris',
      rating: 0,
      reviewsCount: 0,
      description: '',
      priceRange: '',
    };

    const result = await ensurePlaceExists(place, 'user-1');
    expect(result).toBe(existingCustomId);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
