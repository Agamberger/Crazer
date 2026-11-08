import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, IconButton } from '@/shared/components';
import { colors, spacing } from '@/shared/constants/theme';
import { getPlaceCategoryLabel } from '../constants';
import { PlaceItem } from '../types/carte';

export interface PlaceDetailHeaderProps {
  place: PlaceItem;
  isExpanded: boolean;
  isSaved: boolean;
  onToggleExpand: () => void;
  onToggleSaved: () => void;
  onClose: () => void;
}

/** Top row of `PlaceDetailCard`: category, price, open status and the expand / save / close buttons. */
export const PlaceDetailHeader: React.FC<PlaceDetailHeaderProps> = ({
  place,
  isExpanded,
  isSaved,
  onToggleExpand,
  onToggleSaved,
  onClose,
}) => {
  const catInfo = getPlaceCategoryLabel(place.category);

  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <Badge label={catInfo.name} style={{ backgroundColor: catInfo.badgeColor }} />
        <AppText variant="caption" color="muted" weight="semibold" style={styles.price}>
          {place.priceRange}
        </AppText>
        {place.isOpenNow !== undefined ? (
          <Badge
            label={place.isOpenNow ? '🟢 Ouvert' : '🔴 Fermé'}
            tone="neutral"
            style={place.isOpenNow ? styles.openBadge : styles.closedBadge}
          />
        ) : null}
      </View>

      <View style={styles.row}>
        <IconButton
          icon={isExpanded ? 'chevron-down' : 'chevron-up'}
          size="sm"
          onPress={onToggleExpand}
          accessibilityLabel={isExpanded ? 'Réduire' : 'Plein écran'}
          testID="expand-button"
        />
        <IconButton
          icon={isSaved ? 'star' : 'star-outline'}
          size="sm"
          color={isSaved ? colors.warning : undefined}
          onPress={onToggleSaved}
          accessibilityLabel={isSaved ? 'Retirer des enregistrés' : 'Enregistrer le lieu'}
          testID="bookmark-button"
        />
        <IconButton
          icon="close"
          size="sm"
          onPress={onClose}
          accessibilityLabel="Fermer la fiche d'information"
          testID="close-button"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  closedBadge: {
    backgroundColor: colors.errorBackground,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  openBadge: {
    backgroundColor: colors.successBackground,
  },
  price: {
    marginLeft: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
