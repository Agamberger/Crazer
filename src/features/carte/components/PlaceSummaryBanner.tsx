import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { getPlaceCategoryLabel } from '../constants';
import { PlaceItem } from '../types/carte';

export interface PlaceSummaryBannerProps {
  place: PlaceItem;
}

/** Rappel compact du lieu (catégorie, note, nom, adresse). */
export const PlaceSummaryBanner: React.FC<PlaceSummaryBannerProps> = ({ place }) => {
  const category = getPlaceCategoryLabel(place.category);

  return (
    <View style={styles.banner} testID="poi-preview-banner">
      <View style={styles.header}>
        <Badge label={category.name} style={{ backgroundColor: category.badgeColor }} />
        {place.rating > 0 ? (
          <AppText variant="caption" color="warning" weight="semibold">
            ⭐ {place.rating.toFixed(1)}
          </AppText>
        ) : null}
      </View>
      <AppText weight="bold" numberOfLines={1}>
        {place.title}
      </AppText>
      <AppText variant="caption" color="secondary" numberOfLines={1} style={styles.address}>
        📍 {place.address}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  address: {
    marginTop: 2,
  },
  banner: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs / 2,
  },
});
