import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { AppModal, AppText, InlineAlert, Loader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useGooglePlaceDetails } from '../hooks/useGooglePlaces';
import { GooglePlacesError, googlePlaceToPlaceItem } from '../services/googlePlaces';
import { OutingTargetKind, PlaceItem } from '../types/carte';
import { GoogleAttribution } from './GoogleAttribution';
import { PlaceContactChips } from './PlaceContactChips';
import { PlaceDetailActions } from './PlaceDetailActions';
import { PlaceOpeningHours } from './PlaceOpeningHours';
import { PlacePhotoGallery } from './PlacePhotoGallery';

export interface GooglePlaceSheetProps {
  /** Google place to show; the sheet is hidden while `null`. */
  googlePlaceId: string | null;
  /** In-memory id of the selected item, kept on the place given to the actions. */
  placeItemId?: string;
  onClose: () => void;
  onAddToOuting: (place: PlaceItem) => void;
  onGetDirections: (place: PlaceItem) => void;
  isTargetMode: boolean;
  targetKind?: OutingTargetKind;
}

/**
 * Full-screen card of a Google place: photos with their authors, rating, hours, contact and
 * the « Google Maps » credit. Shown away from the map, as the Google Maps Platform EEA terms
 * forbid showing Places content on or next to a non-Google map.
 */
export const GooglePlaceSheet: React.FC<GooglePlaceSheetProps> = ({
  googlePlaceId,
  placeItemId,
  onClose,
  onAddToOuting,
  onGetDirections,
  isTargetMode,
  targetKind,
}) => {
  const lookup = useGooglePlaceDetails(googlePlaceId);

  const renderBody = (): React.ReactNode => {
    if (!lookup || lookup.status === 'loading') {
      return <Loader message="Chargement de la fiche…" testID="google-place-loading" />;
    }
    if (lookup.status === 'unavailable') {
      return (
        <InlineAlert
          tone="error"
          message={new GooglePlacesError(lookup.reason).userMessage}
          testID="google-place-error"
        />
      );
    }
    const place = googlePlaceToPlaceItem(lookup.place, placeItemId);
    return (
      <>
        <PlacePhotoGallery
          photos={place.images ?? []}
          credits={place.imageCredits}
          placeTitle={place.title}
          isExpanded
        />
        <AppText variant="h3" weight="bold">
          {place.title}
        </AppText>
        <AppText variant="bodySmall" color="secondary">
          📍 {place.address}
        </AppText>
        {place.rating > 0 ? (
          <AppText variant="bodySmall" testID="google-place-rating">
            ⭐ {place.rating.toFixed(1)} ({place.reviewsCount} avis)
            {place.priceRange ? ` · ${place.priceRange}` : ''}
          </AppText>
        ) : null}
        {place.isOpenNow !== undefined ? (
          <AppText variant="bodySmall" color={place.isOpenNow ? 'success' : 'error'}>
            {place.isOpenNow ? 'Ouvert maintenant' : 'Fermé maintenant'}
          </AppText>
        ) : null}
        <PlaceContactChips phone={place.phone} website={place.website} />
        {place.openingHours && place.openingHours.length > 0 ? (
          <PlaceOpeningHours hours={place.openingHours} expanded onToggle={() => undefined} />
        ) : null}
        <GoogleAttribution googleMapsUri={place.googleMapsUri} />
        <View style={styles.actions}>
          <PlaceDetailActions
            isTargetMode={isTargetMode}
            targetKind={targetKind}
            onGetDirections={() => onGetDirections(place)}
            onAddToOuting={() => onAddToOuting(place)}
          />
        </View>
      </>
    );
  };

  return (
    <AppModal
      visible={googlePlaceId !== null}
      onClose={onClose}
      variant="slideOver"
      title="Fiche du lieu"
      closeAccessibilityLabel="Revenir à la carte"
      testID="google-place-sheet"
    >
      <ScrollView contentContainerStyle={styles.content}>{renderBody()}</ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.md,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.md,
  },
});
