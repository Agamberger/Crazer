/**
 * Domain types of the Google Places API (New) as used by Crazer.
 *
 * None of these values may be persisted (Google Maps Platform terms): only the place ID
 * (`placeId`) is stored in `public.places.source_id`. Everything else lives in memory.
 */

/** Why a Google Places request failed. */
export type GooglePlacesErrorKind =
  | 'missing_key'
  | 'invalid_key'
  | 'quota_exceeded'
  | 'not_found'
  | 'invalid_request'
  | 'network'
  | 'invalid_response';

/** Amount of data requested for a place, which decides the billed SKU. */
export type GooglePlaceTier = 'summary' | 'details';

/** One autocomplete suggestion. */
export interface GooglePlacePrediction {
  placeId: string;
  /** Full text, e.g. « Tour Eiffel, Avenue Gustave Eiffel, Paris, France ». */
  description: string;
  /** Main part, e.g. « Tour Eiffel ». */
  mainText: string;
  /** Secondary part, e.g. « Avenue Gustave Eiffel, Paris, France ». */
  secondaryText?: string;
  types: string[];
}

/** Author of a photo or review, to be credited wherever it is shown. */
export interface GoogleAuthorAttribution {
  displayName: string;
  uri?: string;
  photoUri?: string;
}

/** A Google photo reference; its URL is built on display and never stored. */
export interface GooglePlacePhoto {
  /** Resource name, e.g. `places/ChIJ…/photos/AUc…`. */
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions: GoogleAuthorAttribution[];
}

/** Price level of a place, as returned by Google. */
export type GooglePriceLevel =
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

/** Light data of a place, enough for lists and map pins. */
export interface GooglePlaceSummary {
  tier: GooglePlaceTier;
  placeId: string;
  name: string;
  address?: string;
  /** `null` when Google returned no location. */
  latitude: number | null;
  longitude: number | null;
  types: string[];
  /** Link to the place on Google Maps (required attribution target). */
  googleMapsUri?: string;
}

/** Full data of a place, only requested when its card is opened. */
export interface GooglePlaceDetails extends GooglePlaceSummary {
  tier: 'details';
  rating?: number;
  userRatingCount?: number;
  priceLevel?: GooglePriceLevel;
  /** One line per day, e.g. « lundi: 12:00 – 23:00 ». */
  weekdayHours?: string[];
  isOpenNow?: boolean;
  phone?: string;
  website?: string;
  photos: GooglePlacePhoto[];
}
