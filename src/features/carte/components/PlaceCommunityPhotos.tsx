import React, { useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { PlacePhotosSection } from '@/features/place-contributions';
import { useSavedPlaceId } from '../hooks/useSavedPlaceId';
import { ensurePlaceExists } from '../services/placeService';
import { PlaceItem } from '../types/carte';

export interface PlaceCommunityPhotosProps {
  place: PlaceItem;
}

/**
 * Photo strip of a map place: community photos first, then the place's own photos (Google
 * Maps or stored), each credited. The place is saved on the first upload
 * (`ensurePlaceExists`: a Google place keeps only its place ID).
 */
export const PlaceCommunityPhotos: React.FC<PlaceCommunityPhotosProps> = ({ place }) => {
  const { user } = useAuth();
  const placeId = useSavedPlaceId(place);
  const resolvePlaceId = useCallback(() => ensurePlaceExists(place, user?.id), [place, user?.id]);

  const otherPhotos = (place.images ?? []).map((url, index) => ({
    url,
    credit: place.imageCredits?.[index],
  }));

  return (
    <PlacePhotosSection
      placeId={placeId}
      resolvePlaceId={resolvePlaceId}
      placeTitle={place.title}
      otherPhotos={otherPhotos}
    />
  );
};
