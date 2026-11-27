import { errorKindFromResponse, GooglePlacesError } from './googlePlacesError';
import {
  parseAutocompleteResponse,
  parsePlaceResponse,
  readErrorStatus,
} from './googlePlacesParsers';
import {
  GooglePlaceDetails,
  GooglePlacePrediction,
  GooglePlaceSummary,
  GooglePlaceTier,
} from './googlePlacesTypes';

export const GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1';

/**
 * Fields requested per tier. Billing follows the most expensive field:
 * summary = Place Details Pro (`displayName`, `googleMapsUri`),
 * details = Place Details Enterprise (rating, hours, phone, website).
 */
export const PLACE_FIELD_MASKS: Record<GooglePlaceTier, readonly string[]> = {
  summary: ['id', 'displayName', 'formattedAddress', 'location', 'types', 'googleMapsUri'],
  details: [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'types',
    'googleMapsUri',
    'rating',
    'userRatingCount',
    'priceLevel',
    'regularOpeningHours',
    'currentOpeningHours',
    'nationalPhoneNumber',
    'websiteUri',
    'photos',
  ],
};

const AUTOCOMPLETE_REGION_CODES = ['fr'];
const LANGUAGE_CODE = 'fr';
export const PHOTO_MAX_WIDTH_PX = 800;

/** Public Google Places key of the app (empty when not configured). */
export function getGooglePlacesApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';
}

const requireApiKey = (): string => {
  const key = getGooglePlacesApiKey();
  if (!key) throw new GooglePlacesError('missing_key', 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');
  return key;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const sendRequest = async (url: string, init: RequestInit): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    throw new GooglePlacesError('network', error instanceof Error ? error.message : undefined);
  }
  const body = await readJson(response);
  if (!response.ok) {
    const status = readErrorStatus(body);
    throw new GooglePlacesError(
      errorKindFromResponse(response.status, status),
      `HTTP ${response.status}${status ? ` ${status}` : ''}`,
    );
  }
  if (body === undefined) throw new GooglePlacesError('invalid_response', 'body is not JSON');
  return body;
};

/**
 * Autocomplete (New) restricted to France, in French.
 *
 * @param input - text typed by the user
 * @param sessionToken - token shared with the details request that ends the session
 * @returns the place predictions
 * @throws GooglePlacesError on any failure
 */
export async function requestAutocomplete(
  input: string,
  sessionToken?: string,
): Promise<GooglePlacePrediction[]> {
  const key = requireApiKey();
  const body = await sendRequest(`${GOOGLE_PLACES_API_URL}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input,
      includedRegionCodes: AUTOCOMPLETE_REGION_CODES,
      languageCode: LANGUAGE_CODE,
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });
  return parseAutocompleteResponse(body);
}

/**
 * Place Details (New) for one place ID, with the field mask of the tier.
 *
 * @param placeId - Google place ID
 * @param tier - `summary` (lists) or `details` (place card)
 * @param sessionToken - token of the autocomplete session this request ends
 * @returns the summary or the details of the place
 * @throws GooglePlacesError on any failure (`not_found` when the ID no longer exists)
 */
export async function requestPlace(
  placeId: string,
  tier: 'summary',
  sessionToken?: string,
): Promise<GooglePlaceSummary>;
export async function requestPlace(
  placeId: string,
  tier: 'details',
  sessionToken?: string,
): Promise<GooglePlaceDetails>;
export async function requestPlace(
  placeId: string,
  tier: GooglePlaceTier,
  sessionToken?: string,
): Promise<GooglePlaceSummary | GooglePlaceDetails>;
export async function requestPlace(
  placeId: string,
  tier: GooglePlaceTier,
  sessionToken?: string,
): Promise<GooglePlaceSummary | GooglePlaceDetails> {
  if (!placeId.trim()) throw new GooglePlacesError('invalid_request', 'empty place id');
  const key = requireApiKey();
  const params = new URLSearchParams({ languageCode: LANGUAGE_CODE });
  if (sessionToken) params.set('sessionToken', sessionToken);
  const body = await sendRequest(
    `${GOOGLE_PLACES_API_URL}/places/${encodeURIComponent(placeId)}?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': PLACE_FIELD_MASKS[tier].join(',') },
    },
  );
  return parsePlaceResponse(body, tier);
}

/**
 * Display URL of a Google photo (Place Photos SKU, billed when the image loads).
 * Built on display only: it carries the key and must never be stored.
 *
 * @param photoName - resource name of the photo (`places/…/photos/…`)
 * @param maxWidthPx - maximum width of the image
 * @returns the URL, or `null` when no key is configured
 */
export function buildPlacePhotoUrl(
  photoName: string,
  maxWidthPx: number = PHOTO_MAX_WIDTH_PX,
): string | null {
  const key = getGooglePlacesApiKey();
  if (!key || !photoName) return null;
  const params = new URLSearchParams({ maxWidthPx: String(maxWidthPx), key });
  return `${GOOGLE_PLACES_API_URL}/${photoName}/media?${params.toString()}`;
}
