import React, { useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { PlaceHoursSection } from '@/features/place-contributions';
import { useSavedPlaceId } from '../hooks/useSavedPlaceId';
import { ensurePlaceExists } from '../services/placeService';
import { PlaceItem } from '../types/carte';

export interface PlaceCommunityHoursProps {
  place: PlaceItem;
}

/**
 * Opening hours of a map place: community hours first (✓), the place's own source (Google
 * Maps or the stored data) as a fallback or one tap away. The place is saved on the first
 * proposal (`ensurePlaceExists`: a Google place keeps only its place ID).
 */
export const PlaceCommunityHours: React.FC<PlaceCommunityHoursProps> = ({ place }) => {
  const { user } = useAuth();
  const placeId = useSavedPlaceId(place);
  const resolvePlaceId = useCallback(() => ensurePlaceExists(place, user?.id), [place, user?.id]);

  return (
    <PlaceHoursSection
      placeId={placeId}
      resolvePlaceId={resolvePlaceId}
      fallbackHours={place.openingHours}
      fallbackOpenNow={place.isOpenNow}
      fallbackSourceLabel={place.googlePlaceId ? 'Google Maps' : undefined}
    />
  );
};
