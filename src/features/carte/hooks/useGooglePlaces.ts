import { useEffect, useMemo, useState } from 'react';
import {
  getGooglePlaceDetails,
  getGooglePlaceSummary,
  GooglePlaceDetails,
  GooglePlacesErrorKind,
  GooglePlaceSummary,
  toGooglePlacesErrorKind,
} from '../services/googlePlaces';

/** State of a Google lookup for one place. */
export type GooglePlaceLookup<T> =
  | { status: 'loading' }
  | { status: 'ready'; place: T }
  | { status: 'unavailable'; reason: GooglePlacesErrorKind };

const LOADING: { status: 'loading' } = { status: 'loading' };

const uniqueIds = (ids: readonly (string | null | undefined)[]): string[] =>
  Array.from(new Set(ids.filter((id): id is string => Boolean(id)))).sort();

/**
 * Light Google data of several places, loaded in parallel and shared through the session
 * cache. Ids missing from the result are still loading.
 *
 * @param placeIds - Google place IDs (null/undefined and duplicates are ignored)
 * @returns one lookup per place ID
 */
export function useGooglePlaceSummaries(
  placeIds: readonly (string | null | undefined)[],
): Record<string, GooglePlaceLookup<GooglePlaceSummary>> {
  const idsKey = uniqueIds(placeIds).join('|');
  const ids = useMemo(() => (idsKey ? idsKey.split('|') : []), [idsKey]);
  const [lookups, setLookups] = useState<Record<string, GooglePlaceLookup<GooglePlaceSummary>>>({});

  useEffect(() => {
    let isCurrent = true;
    ids.forEach((placeId) => {
      getGooglePlaceSummary(placeId)
        .then((place) => {
          if (isCurrent) setLookups((prev) => ({ ...prev, [placeId]: { status: 'ready', place } }));
        })
        .catch((error: unknown) => {
          if (!isCurrent) return;
          const reason = toGooglePlacesErrorKind(error);
          setLookups((prev) => ({ ...prev, [placeId]: { status: 'unavailable', reason } }));
        });
    });
    return () => {
      isCurrent = false;
    };
  }, [ids]);

  return useMemo(
    () => Object.fromEntries(ids.map((placeId) => [placeId, lookups[placeId] ?? LOADING])),
    [ids, lookups],
  );
}

/**
 * Full Google data of one place (place card), from the session cache when possible.
 *
 * @param placeId - Google place ID, or `null` when the place is not a Google place
 * @returns the lookup, or `null` when `placeId` is `null`
 */
export function useGooglePlaceDetails(
  placeId: string | null | undefined,
): GooglePlaceLookup<GooglePlaceDetails> | null {
  const [lookup, setLookup] = useState<{
    placeId: string;
    value: GooglePlaceLookup<GooglePlaceDetails>;
  } | null>(null);

  useEffect(() => {
    if (!placeId) return undefined;
    let isCurrent = true;
    getGooglePlaceDetails(placeId)
      .then((place) => {
        if (isCurrent) setLookup({ placeId, value: { status: 'ready', place } });
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLookup({
            placeId,
            value: { status: 'unavailable', reason: toGooglePlacesErrorKind(error) },
          });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [placeId]);

  if (!placeId) return null;
  return lookup?.placeId === placeId ? lookup.value : LOADING;
}
