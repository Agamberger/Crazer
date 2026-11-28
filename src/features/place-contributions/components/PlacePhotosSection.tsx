import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { InlineAlert } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useAuth } from '@/features/auth';
import { DisplayedPlacePhoto, usePlacePhotos } from '../hooks/usePlacePhotos';
import { AddPhotoTile } from './AddPhotoTile';
import { PhotoThumbnail } from './PhotoThumbnail';
import { PlacePhotoViewer } from './PlacePhotoViewer';

/** A photo from another source (Google Maps, stored data) shown in the same strip. */
export interface OtherPlacePhoto {
  url: string;
  /** Author to credit, when the source gives one (required for Google photos). */
  credit?: string;
}

export interface PlacePhotosSectionProps {
  /** `places` id, or `null` while the place is not saved yet. */
  placeId: string | null;
  /** Saves the place if needed and returns its `places` id (before the first upload). */
  resolvePlaceId: () => Promise<string>;
  placeTitle: string;
  /** Photos of the other source, shown after the community's. */
  otherPhotos?: readonly OtherPlacePhoto[];
}

/**
 * One merged photo strip: a discreet « + » tile, the photos added by Crazer users (tap: full
 * view with report / delete), then the other source's photos. Every photo carries its small
 * « © author » credit; no source heading.
 */
export const PlacePhotosSection: React.FC<PlacePhotosSectionProps> = ({
  placeId,
  resolvePlaceId,
  placeTitle,
  otherPhotos = [],
}) => {
  const { user } = useAuth();
  const photos = usePlacePhotos({ placeId, resolvePlaceId });
  const [openedPhoto, setOpenedPhoto] = useState<DisplayedPlacePhoto | null>(null);

  return (
    <View style={styles.section} testID="place-photos-section">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
        testID="place-photos-strip"
      >
        <AddPhotoTile
          isUploading={photos.isUploading}
          onAdd={(source) => void photos.addPhoto(source)}
        />
        {photos.photos.map((photo, index) => (
          <PhotoThumbnail
            key={photo.id}
            url={photo.thumbnailUrl}
            credit={photo.uploaderName}
            onPress={() => setOpenedPhoto(photo)}
            accessibilityLabel={`Photo ${index + 1} de ${placeTitle} par ${photo.uploaderName}`}
            testID={`place-photo-${photo.id}`}
          />
        ))}
        {otherPhotos.map((photo, index) => (
          <PhotoThumbnail
            key={`${photo.url}-${index}`}
            url={photo.url}
            credit={photo.credit}
            accessibilityLabel={`Photo de ${placeTitle}${photo.credit ? ` par ${photo.credit}` : ''}`}
            testID={`place-other-photo-${index}`}
          />
        ))}
      </ScrollView>

      {photos.error ? (
        <InlineAlert
          tone="error"
          message={photos.error}
          onDismiss={photos.clearError}
          testID="place-photos-error"
        />
      ) : null}

      <PlacePhotoViewer
        photo={openedPhoto}
        isOwnPhoto={openedPhoto !== null && openedPhoto.uploadedBy === user?.id}
        onClose={() => setOpenedPhoto(null)}
        onReport={async (reason) => {
          if (openedPhoto) await photos.reportPhoto(openedPhoto.id, reason);
        }}
        onDelete={async () => {
          if (openedPhoto) await photos.deletePhoto(openedPhoto);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  strip: {
    gap: spacing.xs,
  },
});
