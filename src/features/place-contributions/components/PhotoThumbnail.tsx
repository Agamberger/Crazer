import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/shared/components';
import { colors, radii } from '@/shared/constants/theme';

export const THUMBNAIL_WIDTH = 150;
export const THUMBNAIL_HEIGHT = 110;

export interface PhotoThumbnailProps {
  /** Display URL, `null` while it is not available. */
  url: string | null;
  /** Author credited under the photo (« © Name »). */
  credit?: string;
  accessibilityLabel: string;
  /** Opens the photo; the thumbnail is not pressable without it. */
  onPress?: () => void;
  testID?: string;
}

/** One photo of the place strip, with its small « © author » credit underneath. */
export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  url,
  credit,
  accessibilityLabel,
  onPress,
  testID,
}) => {
  const image = url ? (
    <Image source={{ uri: url }} style={styles.image} accessibilityLabel={accessibilityLabel} />
  ) : (
    <View style={[styles.image, styles.placeholder]} />
  );
  const creditText = credit ? (
    <AppText
      variant="caption"
      color="muted"
      numberOfLines={1}
      style={styles.credit}
      testID={testID ? `${testID}-credit` : undefined}
    >
      © {credit}
    </AppText>
  ) : null;

  if (!onPress) {
    return (
      <View testID={testID}>
        {image}
        {creditText}
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {image}
      {creditText}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  credit: {
    marginTop: 2,
    maxWidth: THUMBNAIL_WIDTH,
  },
  image: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.sm + 2,
    height: THUMBNAIL_HEIGHT,
    width: THUMBNAIL_WIDTH,
  },
  placeholder: {
    backgroundColor: colors.surfaceLight,
  },
});
