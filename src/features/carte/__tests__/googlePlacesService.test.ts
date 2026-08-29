import {
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
});
