import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';

export interface PlacePhotoGalleryProps {
  photos: string[];
  placeTitle: string;
  /** Bigger thumbnails when the place sheet is expanded. */
  isExpanded: boolean;
  /** Author of each photo, same order (Google requires crediting them under the photo). */
  credits?: (string | undefined)[];
}

/** Horizontal strip of place photos. Renders nothing without photos. */
export const PlacePhotoGallery: React.FC<PlacePhotoGalleryProps> = ({
  photos,
  placeTitle,
  isExpanded,
  credits,
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
      {photos.map((url, idx) => {
        const credit = credits?.[idx];
        return (
          <View key={`${url}-${idx}`}>
            <Image
              source={{ uri: url }}
              style={[styles.photo, isExpanded && styles.photoExpanded]}
              resizeMode="cover"
              accessibilityLabel={`Photo ${idx + 1} de ${placeTitle}`}
            />
            {credit ? (
              <AppText
                variant="caption"
                color="muted"
                numberOfLines={1}
                style={[styles.credit, isExpanded && styles.creditExpanded]}
                testID={`place-photo-credit-${idx}`}
              >
                © {credit}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  credit: {
    marginTop: 2,
    maxWidth: 96,
  },
  creditExpanded: {
    maxWidth: 150,
  },
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
