import React from 'react';
import { AppText, AppTextVariant } from '@/shared/components';
import { useGooglePlaceSummaries } from '../hooks/useGooglePlaces';

/** A saved place as stored in `public.places`: Google places only carry their place ID. */
export interface StoredPlaceRef {
  name: string | null;
  address: string | null;
  /** Google place ID when the place comes from Google (name/address are then fetched live). */
  googlePlaceId: string | null;
}

export interface PlaceNameLabelProps {
  place: StoredPlaceRef;
  /** Also show the address after the name. */
  showAddress?: boolean;
  variant?: AppTextVariant;
  testID?: string;
}

interface LabelContent {
  text: string;
  isGoogleData: boolean;
}

const LOADING_TEXT = 'Chargement du lieu…';
const UNAVAILABLE_TEXT = 'Lieu indisponible';

const formatLabel = (name: string, address: string | null | undefined, showAddress: boolean) =>
  showAddress && address ? `${name} · ${address}` : name;

/**
 * « 📍 name · address » of a saved place. A Google place is resolved live through the
 * session cache and credited « Google Maps », as Google Maps Platform terms require.
 */
export const PlaceNameLabel: React.FC<PlaceNameLabelProps> = ({
  place,
  showAddress = false,
  variant = 'bodySmall',
  testID,
}) => {
  const lookups = useGooglePlaceSummaries([place.googlePlaceId]);
  const lookup = place.googlePlaceId ? lookups[place.googlePlaceId] : undefined;

  const content: LabelContent = (() => {
    if (!place.googlePlaceId) {
      return {
        text: formatLabel(place.name ?? UNAVAILABLE_TEXT, place.address, showAddress),
        isGoogleData: false,
      };
    }
    if (!lookup || lookup.status === 'loading') return { text: LOADING_TEXT, isGoogleData: false };
    if (lookup.status === 'unavailable') return { text: UNAVAILABLE_TEXT, isGoogleData: false };
    return {
      text: formatLabel(lookup.place.name, lookup.place.address, showAddress),
      isGoogleData: true,
    };
  })();

  return (
    <AppText variant={variant} color="secondary" testID={testID}>
      📍 {content.text}
      {content.isGoogleData ? (
        <AppText
          variant="caption"
          color="muted"
          testID={testID ? `${testID}-attribution` : undefined}
        >
          {' · Google Maps'}
        </AppText>
      ) : null}
    </AppText>
  );
};
