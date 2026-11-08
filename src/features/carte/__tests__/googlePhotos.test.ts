import {
  GOOGLE_PHOTO_PREFIX,
  buildGooglePhotoUrl,
  toDisplayImageUrl,
  toStorableImageRef,
} from '@/features/carte/utils/googlePhotos';
import { PlaceItem, placeItemToCreatePlaceDto, placeToPlaceItem } from '@/features/carte/types/carte';
import { PlaceSearchResult } from '@/shared/types/place';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const PHOTO_URL =
  'https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=REF_123&key=SECRET';

describe('googlePhotos', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'SECRET';
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = ORIGINAL_KEY;
  });

  it('stocke une photo Google sous forme de référence, sans la clé', () => {
    expect(toStorableImageRef(PHOTO_URL)).toBe(`${GOOGLE_PHOTO_PREFIX}REF_123`);
  });

  it('retire la clé de toute autre URL Google', () => {
    expect(toStorableImageRef('https://maps.googleapis.com/x?key=SECRET&size=2')).toBe(
      'https://maps.googleapis.com/x?size=2',
    );
  });

  it('laisse intactes les URLs tierces', () => {
    expect(toStorableImageRef('https://example.com/a.jpg?key=public')).toBe(
      'https://example.com/a.jpg?key=public',
    );
  });

  it("reconstruit l'URL d'affichage avec la clé courante", () => {
    expect(toDisplayImageUrl(`${GOOGLE_PHOTO_PREFIX}REF_123`)).toBe(buildGooglePhotoUrl('REF_123'));
    expect(buildGooglePhotoUrl('REF_123')).toContain('key=SECRET');
    expect(toDisplayImageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it("ignore une référence Google quand aucune clé n'est configurée", () => {
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = '';
    expect(toDisplayImageUrl(`${GOOGLE_PHOTO_PREFIX}REF_123`)).toBeNull();
  });

  it("le DTO d'insertion en base ne contient jamais la clé API", () => {
    const place: PlaceItem = {
      id: 'google-ChIJ1',
      title: 'Café Google',
      category: 'resto',
      latitude: 48.85,
      longitude: 2.35,
      address: '1 rue test, 75001 Paris',
      rating: 4.6,
      reviewsCount: 3,
      imageUrl: PHOTO_URL,
      images: [PHOTO_URL],
    };

    const dto = placeItemToCreatePlaceDto(place, 'user-1');

    expect(JSON.stringify(dto)).not.toContain('SECRET');
    expect(dto.images).toEqual([`${GOOGLE_PHOTO_PREFIX}REF_123`]);
  });

  it("placeToPlaceItem résout les références et n'invente pas de note", () => {
    const row: PlaceSearchResult = {
      id: 'p1',
      name: 'Café',
      category: 'resto',
      latitude: 48.85,
      longitude: 2.35,
      address: null,
      city: 'Paris',
      rating: null,
      reviews_count: 0,
      price_range: null,
      images: [`${GOOGLE_PHOTO_PREFIX}REF_123`, 'https://example.com/b.jpg'],
      tags: [],
      source: 'google',
      distance_m: null,
    };

    const item = placeToPlaceItem(row);

    expect(item.images).toEqual([buildGooglePhotoUrl('REF_123'), 'https://example.com/b.jpg']);
    expect(item.imageUrl).toBe(buildGooglePhotoUrl('REF_123'));
    expect(item.rating).toBe(0);
  });
});
