import {
  createPlacesSessionToken,
  fetchGooglePlaceAutocomplete,
  fetchGooglePlaceDetails,
  googlePlaceDetailsToPlaceItem,
  googlePlaceDetailsToPoiItem,
  mapGoogleTypesToCategory,
} from '../services/googlePlacesService';

describe('googlePlacesService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'test_key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('mapGoogleTypesToCategory', () => {
    test('mappe restaurant à resto', () => {
      expect(mapGoogleTypesToCategory(['restaurant', 'point_of_interest'])).toBe('resto');
    });

    test('mappe bar à bar', () => {
      expect(mapGoogleTypesToCategory(['bar', 'establishment'])).toBe('bar');
    });

    test('mappe museum à culture', () => {
      expect(mapGoogleTypesToCategory(['museum'])).toBe('culture');
    });

    test('mappe park à nature', () => {
      expect(mapGoogleTypesToCategory(['park'])).toBe('nature');
    });

    test('mappe bowling_alley à activite', () => {
      expect(mapGoogleTypesToCategory(['bowling_alley'])).toBe('activite');
    });

    test('retourne activite par défaut', () => {
      expect(mapGoogleTypesToCategory(['geocode'])).toBe('activite');
      expect(mapGoogleTypesToCategory([])).toBe('activite');
    });
  });

  describe('googlePlaceDetailsToPlaceItem', () => {
    test('convertit correctement un détail Google Place en PlaceItem', () => {
      const details = {
        place_id: 'ChIJ123456',
        name: 'Le Bistro Parisien',
        formatted_address: '10 Rue de Rivoli, 75004 Paris',
        geometry: {
          location: {
            lat: 48.855,
            lng: 2.355,
          },
        },
        rating: 4.5,
        user_ratings_total: 120,
        types: ['restaurant'],
        opening_hours: {
          open_now: true,
          weekday_text: ['Lundi: 09:00–23:00'],
        },
        formatted_phone_number: '01 42 68 00 00',
        website: 'https://bistroparisien.fr',
      };

      const place = googlePlaceDetailsToPlaceItem(details);

      expect(place).toEqual({
        id: 'google-ChIJ123456',
        title: 'Le Bistro Parisien',
        category: 'resto',
        latitude: 48.855,
        longitude: 2.355,
        address: '10 Rue de Rivoli, 75004 Paris',
        rating: 4.5,
        reviewsCount: 120,
        description: '',
        priceRange: '',
        imageUrl: undefined,
        images: [],
        openingHours: ['Lundi: 09:00–23:00'],
        isOpenNow: true,
        phone: '01 42 68 00 00',
        website: 'https://bistroparisien.fr',
      });

      // Vérifie aussi la rétrocompatibilité
      expect(googlePlaceDetailsToPoiItem(details)).toEqual(place);
    });
  });

  describe('fetchGooglePlaceAutocomplete', () => {
    test('retourne un tableau vide si la saisie fait moins de 2 caractères', async () => {
      const res = await fetchGooglePlaceAutocomplete('a');
      expect(res).toEqual([]);
    });

    test('appelle l\'API fetch et retourne les prédictions en cas de succès', async () => {
      const mockPredictions = [
        {
          place_id: 'place_1',
          description: 'Café de Flore, Paris',
          structured_formatting: { main_text: 'Café de Flore', secondary_text: 'Paris' },
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          status: 'OK',
          predictions: mockPredictions,
        }),
      } as unknown as Response);

      const predictions = await fetchGooglePlaceAutocomplete('Café');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://maps.googleapis.com/maps/api/place/autocomplete/json')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('input=Caf%C3%A9')
      );
      expect(predictions).toEqual([
        {
          place_id: 'place_1',
          description: 'Café de Flore, Paris',
          structured_formatting: { main_text: 'Café de Flore', secondary_text: 'Paris' },
          types: undefined,
        },
      ]);
    });
  });

  describe('fetchGooglePlaceDetails', () => {
    test('retourne null si placeId est vide', async () => {
      const res = await fetchGooglePlaceDetails('');
      expect(res).toBeNull();
    });

    test('appelle l\'API fetch et retourne les détails du lieu', async () => {
      const mockResult = {
        place_id: 'place_1',
        name: 'Café de Flore',
        formatted_address: '172 Boulevard Saint-Germain, 75006 Paris',
        geometry: { location: { lat: 48.854, lng: 2.333 } },
        rating: 4.6,
        user_ratings_total: 120,
        price_level: 3,
        types: ['cafe', 'restaurant'],
      };

      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          status: 'OK',
          result: mockResult,
        }),
      } as unknown as Response);

      const details = await fetchGooglePlaceDetails('place_1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://maps.googleapis.com/maps/api/place/details/json')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('place_id=place_1')
      );
      expect(details).toEqual({
        place_id: 'place_1',
        name: 'Café de Flore',
        formatted_address: '172 Boulevard Saint-Germain, 75006 Paris',
        vicinity: undefined,
        geometry: { location: { lat: 48.854, lng: 2.333 } },
        rating: 4.6,
        user_ratings_total: 120,
        price_level: 3,
        types: ['cafe', 'restaurant'],
        opening_hours: undefined,
        photos: undefined,
        formatted_phone_number: undefined,
        website: undefined,
      });
    });
  });
  describe('session tokens (facturation groupée)', () => {
    const okResponse = (body: Record<string, unknown>) =>
      ({ json: jest.fn().mockResolvedValue(body) }) as unknown as Response;

    test('createPlacesSessionToken génère des jetons UUID v4 distincts', () => {
      const a = createPlacesSessionToken();
      const b = createPlacesSessionToken();
      expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(a).not.toBe(b);
    });

    test("transmet le même jeton à l'autocomplétion et au détail", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(okResponse({ status: 'OK', predictions: [] }))
        .mockResolvedValueOnce(
          okResponse({
            status: 'OK',
            result: { place_id: 'p', name: 'X', geometry: { location: { lat: 1, lng: 2 } } },
          }),
        );

      await fetchGooglePlaceAutocomplete('Café', 'tok-123');
      await fetchGooglePlaceDetails('p', 'tok-123');

      const urls = (global.fetch as jest.Mock).mock.calls.map(([url]) => url as string);
      expect(urls[0]).toContain('sessiontoken=tok-123');
      expect(urls[1]).toContain('sessiontoken=tok-123');
    });

    test("n'ajoute pas de paramètre sessiontoken sans jeton", async () => {
      global.fetch = jest.fn().mockResolvedValue(okResponse({ status: 'OK', predictions: [] }));

      await fetchGooglePlaceAutocomplete('Café');

      expect((global.fetch as jest.Mock).mock.calls[0][0]).not.toContain('sessiontoken');
    });
  });
});
