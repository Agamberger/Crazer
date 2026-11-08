import React from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@/shared/constants/theme';

export interface PlacePhotoGalleryProps {
  photos: string[];
  placeTitle: string;
  /** Bigger thumbnails when the place sheet is expanded. */
  isExpanded: boolean;
}

/** Horizontal strip of place photos. Renders nothing without photos. */
export const PlacePhotoGallery: React.FC<PlacePhotoGalleryProps> = ({
  photos,
  placeTitle,
  isExpanded,
}) => {
  if (photos.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.photos, isExpanded && styles.photosExpanded]}
      contentContainerStyle={styles.photosContent}
      testID="place-photos-gallery"
    >
      {photos.map((url, idx) => (
        <Image
          key={`${url}-${idx}`}
          source={{ uri: url }}
          style={[styles.photo, isExpanded && styles.photoExpanded]}
          resizeMode="cover"
          accessibilityLabel={`Photo ${idx + 1} de ${placeTitle}`}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  photo: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.sm + 2,
    height: 72,
    width: 96,
  },
  photoExpanded: {
    height: 110,
    width: 150,
  },
  photos: {
    marginBottom: spacing.sm,
  },
  photosContent: {
    gap: spacing.xs,
  },
  photosExpanded: {
    marginBottom: spacing.md,
  },
});
