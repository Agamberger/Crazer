import {
  formatGooglePriceLevel,
  googlePlaceToPlaceItem,
  mapGoogleTypesToCategory,
} from '../services/googlePlaces';
import { GooglePlaceDetails, GooglePlaceSummary } from '../services/googlePlaces';

const summary: GooglePlaceSummary = {
  tier: 'summary',
  placeId: 'ChIJ1',
  name: 'Le Comptoir',
  address: '12 rue X, Paris',
  latitude: 48.85,
  longitude: 2.35,
  types: ['restaurant'],
  googleMapsUri: 'https://maps.google.com/?cid=1',
};

describe('googlePlaceMappers', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'test_key';
  });

  it.each([
    [['restaurant', 'point_of_interest'], 'resto'],
    [['bar'], 'bar'],
    [['museum'], 'culture'],
    [['park'], 'nature'],
    [['bowling_alley'], 'activite'],
    [[], 'activite'],
  ])('maps %j to %s', (types, category) => {
    expect(mapGoogleTypesToCategory(types)).toBe(category);
  });

  it('formats price levels', () => {
    expect(formatGooglePriceLevel('PRICE_LEVEL_MODERATE')).toBe('€€');
    expect(formatGooglePriceLevel('PRICE_LEVEL_FREE')).toBe('Gratuit');
    expect(formatGooglePriceLevel(undefined)).toBeUndefined();
  });

  it('converts a summary into a light place item with the Google id', () => {
    expect(googlePlaceToPlaceItem(summary)).toEqual({
      id: 'google-ChIJ1',
      googlePlaceId: 'ChIJ1',
      googleMapsUri: 'https://maps.google.com/?cid=1',
      title: 'Le Comptoir',
      category: 'resto',
      latitude: 48.85,
      longitude: 2.35,
      address: '12 rue X, Paris',
      rating: 0,
      reviewsCount: 0,
    });
  });

  it('keeps a saved Crazer id and adds details with photo credits', () => {
    const details: GooglePlaceDetails = {
      ...summary,
      tier: 'details',
      rating: 4.5,
      userRatingCount: 12,
      priceLevel: 'PRICE_LEVEL_INEXPENSIVE',
      weekdayHours: ['lundi: fermé'],
      isOpenNow: false,
      phone: '01',
      website: 'https://x.fr',
      photos: [{ name: 'places/ChIJ1/photos/A', authorAttributions: [{ displayName: 'Jo' }] }],
    };

    const item = googlePlaceToPlaceItem(details, 'uuid-1');

    expect(item).toMatchObject({
      id: 'uuid-1',
      rating: 4.5,
      reviewsCount: 12,
      priceRange: '€',
      openingHours: ['lundi: fermé'],
      isOpenNow: false,
      phone: '01',
      website: 'https://x.fr',
      imageCredits: ['Jo'],
    });
    expect(item.images?.[0]).toContain('places/ChIJ1/photos/A/media');
    expect(item.imageUrl).toBe(item.images?.[0]);
  });
});
