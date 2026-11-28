import React, { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppModal, AppText, Button } from '@/shared/components';
import { colors, iconSizes, radii, spacing } from '@/shared/constants/theme';
import { PhotoSource } from '../services/photoProcessing';
import { THUMBNAIL_HEIGHT } from './PhotoThumbnail';

export interface AddPhotoTileProps {
  isUploading: boolean;
  onAdd: (source: PhotoSource) => void;
}

/**
 * Discreet « + » tile at the start of the photo strip. On a phone it asks camera or
 * library; on the web it opens the file picker directly.
 */
export const AddPhotoTile: React.FC<AddPhotoTileProps> = ({ isUploading, onAdd }) => {
  const [isChoosing, setIsChoosing] = useState(false);
  const canUseCamera = Platform.OS !== 'web';

  const choose = (source: PhotoSource) => {
    setIsChoosing(false);
    onAdd(source);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.tile}
        disabled={isUploading}
        onPress={() => (canUseCamera ? setIsChoosing(true) : onAdd('library'))}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une photo"
        testID="place-photos-add"
      >
        {isUploading ? (
          <ActivityIndicator color={colors.textSecondary} />
        ) : (
          <Ionicons name="add" size={iconSizes.lg} color={colors.textSecondary} />
        )}
        <AppText variant="caption" color="muted">
          Photo
        </AppText>
      </TouchableOpacity>

      <AppModal
        visible={isChoosing}
        onClose={() => setIsChoosing(false)}
        variant="sheet"
        title="Ajouter une photo"
        testID="place-photos-add-sheet"
      >
        <View style={styles.choices}>
          <Button
            title="Prendre une photo"
            variant="outline"
            leftIcon="camera-outline"
            onPress={() => choose('camera')}
            testID="place-photos-camera"
          />
          <Button
            title="Depuis la galerie"
            variant="outline"
            leftIcon="image-outline"
            onPress={() => choose('library')}
            testID="place-photos-library"
          />
        </View>
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  choices: {
    gap: spacing.sm,
  },
  tile: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.sm + 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 2,
    height: THUMBNAIL_HEIGHT,
    justifyContent: 'center',
    width: 72,
  },
});
