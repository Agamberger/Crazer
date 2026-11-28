import { useEffect, useState } from 'react';
import { placeContributionsService } from '@/features/place-contributions';
import { PlaceItem } from '../types/carte';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `places` id of a map item: its own id for a saved Crazer place, the row saved by someone
 * for a Google place, `null` when the place is not saved yet (it is saved on the first
 * contribution).
 *
 * @param place - item shown on the map or in a place card
 * @returns the `places` id, or `null`
 */
export function useSavedPlaceId(place: PlaceItem): string | null {
  const ownId = !place.googlePlaceId && UUID_PATTERN.test(place.id) ? place.id : null;
  const [googleRowId, setGoogleRowId] = useState<string | null>(null);

  useEffect(() => {
    setGoogleRowId(null);
    if (!place.googlePlaceId) return undefined;
    let isCurrent = true;
    placeContributionsService
      .findPlaceIdByGooglePlaceId(place.googlePlaceId)
      .then((id) => {
        if (isCurrent) setGoogleRowId(id);
      })
      .catch(() => {
        // Unknown yet: the place is saved on the first contribution.
      });
    return () => {
      isCurrent = false;
    };
  }, [place.googlePlaceId]);

  return ownId ?? googleRowId;
}
