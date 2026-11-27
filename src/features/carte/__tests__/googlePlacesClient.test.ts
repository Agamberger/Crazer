import {
  buildPlacePhotoUrl,
  GOOGLE_PLACES_API_URL,
  PLACE_FIELD_MASKS,
  requestAutocomplete,
  requestPlace,
} from '../services/googlePlaces/googlePlacesClient';
import { GooglePlacesError } from '../services/googlePlaces';

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

const placeBody = {
  id: 'ChIJ1',
  displayName: { text: 'Le Comptoir' },
  formattedAddress: '12 rue X, Paris',
  location: { latitude: 48.85, longitude: 2.35 },
  types: ['restaurant'],
  googleMapsUri: 'https://maps.google.com/?cid=1',
};

describe('googlePlacesClient', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'test_key';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('requestAutocomplete', () => {
    it('posts the input, France restriction and session token with the key header', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          suggestions: [
            {
              placePrediction: {
                placeId: 'ChIJ1',
                text: { text: 'Tour Eiffel, Paris' },
                structuredFormat: {
                  mainText: { text: 'Tour Eiffel' },
                  secondaryText: { text: 'Paris' },
                },
                types: ['tourist_attraction'],
              },
            },
            { queryPrediction: { text: { text: 'tour' } } },
          ],
        }),
      );

      const predictions = await requestAutocomplete('Tour', 'tok-1');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${GOOGLE_PLACES_API_URL}/places:autocomplete`);
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual(expect.objectContaining({ 'X-Goog-Api-Key': 'test_key' }));
      expect(JSON.parse(String(init.body))).toEqual({
        input: 'Tour',
        includedRegionCodes: ['fr'],
        languageCode: 'fr',
        sessionToken: 'tok-1',
      });
      expect(predictions).toEqual([
        {
          placeId: 'ChIJ1',
          description: 'Tour Eiffel, Paris',
          mainText: 'Tour Eiffel',
          secondaryText: 'Paris',
          types: ['tourist_attraction'],
        },
      ]);
    });

    it('omits the session token when there is none', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, {}));
      await expect(requestAutocomplete('Café')).resolves.toEqual([]);
      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).not.toHaveProperty('sessionToken');
    });

    it('fails with missing_key and sends nothing when no key is configured', async () => {
      process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = '';
      await expect(requestAutocomplete('Café')).rejects.toMatchObject({ kind: 'missing_key' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('requestPlace', () => {
    it('requests the summary field mask and parses the place', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, placeBody));

      const place = await requestPlace('ChIJ1', 'summary');

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${GOOGLE_PLACES_API_URL}/places/ChIJ1?languageCode=fr`);
      expect(init.headers).toEqual(
        expect.objectContaining({ 'X-Goog-FieldMask': PLACE_FIELD_MASKS.summary.join(',') }),
      );
      expect(place).toEqual({
        tier: 'summary',
        placeId: 'ChIJ1',
        name: 'Le Comptoir',
        address: '12 rue X, Paris',
        latitude: 48.85,
        longitude: 2.35,
        types: ['restaurant'],
        googleMapsUri: 'https://maps.google.com/?cid=1',
      });
    });

    it('reads rating, hours, contact and photos with their authors for the details tier', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(200, {
          ...placeBody,
          rating: 4.5,
          userRatingCount: 120,
          priceLevel: 'PRICE_LEVEL_MODERATE',
          regularOpeningHours: { weekdayDescriptions: ['lundi: 12:00 – 23:00'] },
          currentOpeningHours: { openNow: true },
          nationalPhoneNumber: '01 23 45 67 89',
          websiteUri: 'https://comptoir.fr',
          photos: [
            {
              name: 'places/ChIJ1/photos/A',
              widthPx: 800,
              authorAttributions: [{ displayName: 'Jo' }],
            },
            { widthPx: 10 },
          ],
        }),
      );

      const place = await requestPlace('ChIJ1', 'details', 'tok-9');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('sessionToken=tok-9');
      expect(place).toMatchObject({
        tier: 'details',
        rating: 4.5,
        userRatingCount: 120,
        priceLevel: 'PRICE_LEVEL_MODERATE',
        weekdayHours: ['lundi: 12:00 – 23:00'],
        isOpenNow: true,
        phone: '01 23 45 67 89',
        website: 'https://comptoir.fr',
        photos: [
          {
            name: 'places/ChIJ1/photos/A',
            widthPx: 800,
            authorAttributions: [{ displayName: 'Jo' }],
          },
        ],
      });
    });

    it.each([
      [429, 'RESOURCE_EXHAUSTED', 'quota_exceeded'],
      [404, 'NOT_FOUND', 'not_found'],
      [403, 'PERMISSION_DENIED', 'invalid_key'],
      [400, 'INVALID_ARGUMENT', 'invalid_request'],
      [500, undefined, 'network'],
    ])('maps HTTP %i (%s) to %s', async (status, googleStatus, kind) => {
      fetchMock.mockResolvedValue(jsonResponse(status, { error: { status: googleStatus } }));
      await expect(requestPlace('ChIJ1', 'summary')).rejects.toMatchObject({ kind });
    });

    it('maps a network failure to network', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const error = await requestPlace('ChIJ1', 'summary').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(GooglePlacesError);
      expect((error as GooglePlacesError).kind).toBe('network');
      expect((error as GooglePlacesError).userMessage).toMatch(/connexion/);
    });

    it('rejects a place without id or name as an invalid response', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { id: 'ChIJ1' }));
      await expect(requestPlace('ChIJ1', 'summary')).rejects.toMatchObject({
        kind: 'invalid_response',
      });
    });

    it('drops a half location instead of inventing coordinates', async () => {
      fetchMock.mockResolvedValue(jsonResponse(200, { ...placeBody, location: { latitude: 48 } }));
      await expect(requestPlace('ChIJ1', 'summary')).resolves.toMatchObject({
        latitude: null,
        longitude: null,
      });
    });

    it('refuses an empty place id without calling Google', async () => {
      await expect(requestPlace(' ', 'summary')).rejects.toMatchObject({ kind: 'invalid_request' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('buildPlacePhotoUrl', () => {
    it('builds the media URL with the key and width', () => {
      expect(buildPlacePhotoUrl('places/ChIJ1/photos/A', 400)).toBe(
        `${GOOGLE_PLACES_API_URL}/places/ChIJ1/photos/A/media?maxWidthPx=400&key=test_key`,
      );
    });

    it('returns null without a key', () => {
      process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = '';
      expect(buildPlacePhotoUrl('places/ChIJ1/photos/A')).toBeNull();
    });
  });
});
