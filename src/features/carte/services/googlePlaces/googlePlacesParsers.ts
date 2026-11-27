import { GooglePlacesError } from './googlePlacesError';
import {
  GoogleAuthorAttribution,
  GooglePlaceDetails,
  GooglePlacePhoto,
  GooglePlacePrediction,
  GooglePlaceSummary,
  GooglePlaceTier,
  GooglePriceLevel,
} from './googlePlacesTypes';

type JsonRecord = Record<string, unknown>;

const PRICE_LEVELS: readonly GooglePriceLevel[] = [
  'PRICE_LEVEL_FREE',
  'PRICE_LEVEL_INEXPENSIVE',
  'PRICE_LEVEL_MODERATE',
  'PRICE_LEVEL_EXPENSIVE',
  'PRICE_LEVEL_VERY_EXPENSIVE',
];

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readRecords = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const readStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** `{ text: "…" }` objects used by Google for localized texts. */
const readText = (value: unknown): string | undefined =>
  isRecord(value) ? readString(value.text) : undefined;

const readPriceLevel = (value: unknown): GooglePriceLevel | undefined =>
  PRICE_LEVELS.find((level) => level === value);

/**
 * Reads the body of an autocomplete (New) response.
 *
 * @param body - parsed JSON body
 * @returns the place predictions (query predictions are ignored)
 * @throws GooglePlacesError `invalid_response` when the body is not an object
 */
export function parseAutocompleteResponse(body: unknown): GooglePlacePrediction[] {
  if (!isRecord(body)) throw new GooglePlacesError('invalid_response', 'autocomplete body');

  return readRecords(body.suggestions).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    if (!isRecord(prediction)) return [];
    const placeId = readString(prediction.placeId);
    const description = readText(prediction.text);
    if (!placeId || !description) return [];
    const structured = isRecord(prediction.structuredFormat) ? prediction.structuredFormat : {};
    return [
      {
        placeId,
        description,
        mainText: readText(structured.mainText) ?? description,
        secondaryText: readText(structured.secondaryText),
        types: readStrings(prediction.types),
      },
    ];
  });
}

const parseAuthor = (value: JsonRecord): GoogleAuthorAttribution[] => {
  const displayName = readString(value.displayName);
  if (!displayName) return [];
  return [{ displayName, uri: readString(value.uri), photoUri: readString(value.photoUri) }];
};

const parsePhoto = (value: JsonRecord): GooglePlacePhoto[] => {
  const name = readString(value.name);
  if (!name) return [];
  return [
    {
      name,
      widthPx: readNumber(value.widthPx),
      heightPx: readNumber(value.heightPx),
      authorAttributions: readRecords(value.authorAttributions).flatMap(parseAuthor),
    },
  ];
};

const parseSummaryFields = (body: JsonRecord, tier: GooglePlaceTier): GooglePlaceSummary => {
  const placeId = readString(body.id);
  const name = readText(body.displayName);
  if (!placeId || !name) throw new GooglePlacesError('invalid_response', 'place without id or name');
  const location = isRecord(body.location) ? body.location : {};
  const latitude = readNumber(location.latitude) ?? null;
  const longitude = readNumber(location.longitude) ?? null;
  return {
    tier,
    placeId,
    name,
    address: readString(body.formattedAddress),
    latitude: latitude !== null && longitude !== null ? latitude : null,
    longitude: latitude !== null && longitude !== null ? longitude : null,
    types: readStrings(body.types),
    googleMapsUri: readString(body.googleMapsUri),
  };
};

/**
 * Reads the body of a Place Details (New) response.
 *
 * @param body - parsed JSON body
 * @param tier - requested tier: `details` also reads rating, hours, contact and photos
 * @returns the summary or the full details of the place
 * @throws GooglePlacesError `invalid_response` when the id or name is missing
 */
export function parsePlaceResponse(body: unknown, tier: 'summary'): GooglePlaceSummary;
export function parsePlaceResponse(body: unknown, tier: 'details'): GooglePlaceDetails;
export function parsePlaceResponse(
  body: unknown,
  tier: GooglePlaceTier,
): GooglePlaceSummary | GooglePlaceDetails;
export function parsePlaceResponse(
  body: unknown,
  tier: GooglePlaceTier,
): GooglePlaceSummary | GooglePlaceDetails {
  if (!isRecord(body)) throw new GooglePlacesError('invalid_response', 'place body');
  const summary = parseSummaryFields(body, tier);
  if (tier === 'summary') return summary;

  const regularHours = isRecord(body.regularOpeningHours) ? body.regularOpeningHours : {};
  const currentHours = isRecord(body.currentOpeningHours) ? body.currentOpeningHours : {};
  const weekdayHours = readStrings(regularHours.weekdayDescriptions);
  const openNow = currentHours.openNow ?? regularHours.openNow;

  return {
    ...summary,
    tier: 'details',
    rating: readNumber(body.rating),
    userRatingCount: readNumber(body.userRatingCount),
    priceLevel: readPriceLevel(body.priceLevel),
    weekdayHours: weekdayHours.length > 0 ? weekdayHours : undefined,
    isOpenNow: typeof openNow === 'boolean' ? openNow : undefined,
    phone: readString(body.nationalPhoneNumber),
    website: readString(body.websiteUri),
    photos: readRecords(body.photos).flatMap(parsePhoto),
  };
}

/**
 * Reads the Google error status of an error body (`{ error: { status } }`).
 *
 * @param body - parsed JSON body, or `undefined` when it was not JSON
 * @returns the status, e.g. `RESOURCE_EXHAUSTED`
 */
export function readErrorStatus(body: unknown): string | undefined {
  if (!isRecord(body) || !isRecord(body.error)) return undefined;
  return readString(body.error.status);
}
