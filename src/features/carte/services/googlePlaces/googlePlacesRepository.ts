import { registerUserScopedReset } from '@/shared/store/sessionReset';
import { requestAutocomplete, requestPlace } from './googlePlacesClient';
import { GooglePlacesError } from './googlePlacesError';
import {
  GooglePlaceDetails,
  GooglePlacePrediction,
  GooglePlaceSummary,
  GooglePlaceTier,
} from './googlePlacesTypes';
import { createQuotaGuard } from './quotaGuard';
import { createSessionMemoryCache } from './sessionMemoryCache';

const PLACE_CACHE_MAX_ENTRIES = 300;
const PLACE_CACHE_TTL_MS = 60 * 60 * 1000;
const PREDICTION_CACHE_MAX_ENTRIES = 100;
const PREDICTION_CACHE_TTL_MS = 5 * 60 * 1000;

/** A cached answer: the place, or the fact that Google no longer knows it. */
type CachedPlace = GooglePlaceSummary | GooglePlaceDetails | 'not_found';

const placeCache = createSessionMemoryCache<CachedPlace>(
  PLACE_CACHE_MAX_ENTRIES,
  PLACE_CACHE_TTL_MS,
);
const predictionCache = createSessionMemoryCache<GooglePlacePrediction[]>(
  PREDICTION_CACHE_MAX_ENTRIES,
  PREDICTION_CACHE_TTL_MS,
);
const inFlight = new Map<string, Promise<GooglePlaceSummary | GooglePlaceDetails>>();
const quotaGuard = createQuotaGuard();

const inFlightKey = (placeId: string, tier: GooglePlaceTier): string => `${tier}:${placeId}`;

/** Cached value that satisfies the tier: full details also serve a summary request. */
const readCached = (
  placeId: string,
  tier: GooglePlaceTier,
): GooglePlaceSummary | GooglePlaceDetails | undefined => {
  const cached = placeCache.get(placeId);
  if (cached === 'not_found') throw new GooglePlacesError('not_found', placeId);
  if (!cached) return undefined;
  return tier === 'summary' || cached.tier === 'details' ? cached : undefined;
};

const fetchAndCache = async (
  placeId: string,
  tier: GooglePlaceTier,
  sessionToken?: string,
): Promise<GooglePlaceSummary | GooglePlaceDetails> => {
  quotaGuard.assertAvailable();
  try {
    const place = await requestPlace(placeId, tier, sessionToken);
    placeCache.set(placeId, place);
    return place;
  } catch (error: unknown) {
    if (error instanceof GooglePlacesError) {
      if (error.kind === 'quota_exceeded') quotaGuard.reportQuotaExceeded();
      if (error.kind === 'not_found') placeCache.set(placeId, 'not_found');
    }
    throw error;
  }
};

function loadPlace(
  placeId: string,
  tier: 'summary',
  sessionToken?: string,
): Promise<GooglePlaceSummary>;
function loadPlace(
  placeId: string,
  tier: 'details',
  sessionToken?: string,
): Promise<GooglePlaceDetails>;
async function loadPlace(
  placeId: string,
  tier: GooglePlaceTier,
  sessionToken?: string,
): Promise<GooglePlaceSummary | GooglePlaceDetails> {
  const cached = readCached(placeId, tier);
  if (cached) return cached;

  const pending =
    inFlight.get(inFlightKey(placeId, 'details')) ??
    (tier === 'summary' ? inFlight.get(inFlightKey(placeId, 'summary')) : undefined);
  if (pending) return pending;

  const key = inFlightKey(placeId, tier);
  const request = fetchAndCache(placeId, tier, sessionToken).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

/**
 * Light data of a Google place (lists, pins), from the session cache when possible.
 *
 * @param placeId - Google place ID
 * @returns the summary of the place
 * @throws GooglePlacesError on any failure
 */
export function getGooglePlaceSummary(placeId: string): Promise<GooglePlaceSummary> {
  return loadPlace(placeId, 'summary');
}

/**
 * Full data of a Google place (place card), from the session cache when possible.
 *
 * @param placeId - Google place ID
 * @param sessionToken - autocomplete session this request ends, if any
 * @returns the details of the place
 * @throws GooglePlacesError on any failure
 */
export function getGooglePlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<GooglePlaceDetails> {
  return loadPlace(placeId, 'details', sessionToken);
}

/**
 * Autocomplete predictions, from the session cache when the same text was typed recently.
 *
 * @param input - text typed by the user (trimmed, at least 2 characters)
 * @param sessionToken - token of the current autocomplete session
 * @returns the predictions, empty for a too short input
 * @throws GooglePlacesError on any failure
 */
export async function searchGooglePlacePredictions(
  input: string,
  sessionToken?: string,
): Promise<GooglePlacePrediction[]> {
  const text = input.trim();
  if (text.length < 2) return [];
  const cacheKey = text.toLowerCase();
  const cached = predictionCache.get(cacheKey);
  if (cached) return cached;

  quotaGuard.assertAvailable();
  try {
    const predictions = await requestAutocomplete(text, sessionToken);
    predictionCache.set(cacheKey, predictions);
    return predictions;
  } catch (error: unknown) {
    if (error instanceof GooglePlacesError && error.kind === 'quota_exceeded') {
      quotaGuard.reportQuotaExceeded();
    }
    throw error;
  }
}

/** Empties the session caches and the quota pause (logout, tests). */
export function clearGooglePlacesCache(): void {
  placeCache.clear();
  predictionCache.clear();
  inFlight.clear();
  quotaGuard.reset();
}

registerUserScopedReset(clearGooglePlacesCache);
