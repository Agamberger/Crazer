import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, IconButton } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';

export interface GooglePlaceMapTeaserProps {
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Small card shown over the map for a selected Google place. It carries no Google content
 * (name, photos, rating…): only the full-screen `GooglePlaceSheet`, away from the map, does.
 */
export const GooglePlaceMapTeaser: React.FC<GooglePlaceMapTeaserProps> = ({ onOpen, onClose }) => (
  <View style={styles.card} testID="google-place-teaser">
    <View style={styles.texts}>
      <AppText weight="semibold">📍 Lieu choisi</AppText>
      <AppText variant="caption" color="secondary">
        Photos, horaires et avis sur sa fiche.
      </AppText>
    </View>
    <Button title="Voir la fiche" size="sm" onPress={onOpen} testID="google-place-teaser-open" />
    <IconButton
      icon="close"
      size="sm"
      onPress={onClose}
      accessibilityLabel="Désélectionner le lieu"
      testID="google-place-teaser-close"
    />
  </View>
);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
    padding: spacing.md,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
