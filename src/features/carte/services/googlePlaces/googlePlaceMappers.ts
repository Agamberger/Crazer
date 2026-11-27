import { PlaceCategoryFilter, PlaceItem } from '../../types/carte';
import { buildPlacePhotoUrl } from './googlePlacesClient';
import { GooglePlaceDetails, GooglePlaceSummary, GooglePriceLevel } from './googlePlacesTypes';

/** Prefix of the in-memory id of a Google place that is not saved in `places` yet. */
export const GOOGLE_PLACE_ITEM_PREFIX = 'google-';

const CATEGORY_TYPES: readonly [PlaceCategoryFilter, readonly string[]][] = [
  ['resto', ['restaurant', 'cafe', 'bakery', 'meal_takeaway', 'food']],
  ['bar', ['bar', 'night_club', 'pub', 'wine_bar']],
  [
    'culture',
    [
      'museum',
      'art_gallery',
      'church',
      'hindu_temple',
      'mosque',
      'synagogue',
      'tourist_attraction',
    ],
  ],
  ['nature', ['park', 'natural_feature', 'campground', 'national_park', 'hiking_area']],
];

const PRICE_SYMBOLS: Record<GooglePriceLevel, string> = {
  PRICE_LEVEL_FREE: 'Gratuit',
  PRICE_LEVEL_INEXPENSIVE: '€',
  PRICE_LEVEL_MODERATE: '€€',
  PRICE_LEVEL_EXPENSIVE: '€€€',
  PRICE_LEVEL_VERY_EXPENSIVE: '€€€€',
};

/**
 * Maps Google place types to a Crazer category (computed on display, never stored).
 *
 * @param types - Google types of the place
 * @returns the category, `activite` by default
 */
export function mapGoogleTypesToCategory(types?: readonly string[]): PlaceCategoryFilter {
  if (!types || types.length === 0) return 'activite';
  const typeSet = new Set(types);
  const match = CATEGORY_TYPES.find(([, candidates]) => candidates.some((t) => typeSet.has(t)));
  return match ? match[0] : 'activite';
}

/**
 * Price symbol of a Google price level.
 *
 * @param level - Google price level
 * @returns « € » to « €€€€ », « Gratuit », or `undefined`
 */
export function formatGooglePriceLevel(level?: GooglePriceLevel): string | undefined {
  return level ? PRICE_SYMBOLS[level] : undefined;
}

const isDetails = (place: GooglePlaceSummary | GooglePlaceDetails): place is GooglePlaceDetails =>
  place.tier === 'details';

/**
 * Converts Google data into the `PlaceItem` used by the map and the place card.
 * The result lives in memory only.
 *
 * @param place - summary or details of a Google place
 * @param id - id to give the item (a Crazer UUID when the place is saved)
 * @returns the place item
 */
export function googlePlaceToPlaceItem(
  place: GooglePlaceSummary | GooglePlaceDetails,
  id: string = `${GOOGLE_PLACE_ITEM_PREFIX}${place.placeId}`,
): PlaceItem {
  const base: PlaceItem = {
    id,
    googlePlaceId: place.placeId,
    googleMapsUri: place.googleMapsUri,
    title: place.name,
    category: mapGoogleTypesToCategory(place.types),
    latitude: place.latitude ?? 0,
    longitude: place.longitude ?? 0,
    address: place.address ?? 'Adresse non spécifiée',
    rating: 0,
    reviewsCount: 0,
  };
  if (!isDetails(place)) return base;

  const photos = place.photos.flatMap((photo) => {
    const url = buildPlacePhotoUrl(photo.name);
    return url ? [{ url, credit: photo.authorAttributions[0]?.displayName }] : [];
  });

  return {
    ...base,
    rating: place.rating ?? 0,
    reviewsCount: place.userRatingCount ?? 0,
    priceRange: formatGooglePriceLevel(place.priceLevel),
    imageUrl: photos[0]?.url,
    images: photos.map((photo) => photo.url),
    imageCredits: photos.map((photo) => photo.credit),
    openingHours: place.weekdayHours,
    isOpenNow: place.isOpenNow,
    phone: place.phone,
    website: place.website,
  };
}
