import React, { useState } from 'react';
import { Animated, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { usePlaceSheetGesture } from '../hooks/usePlaceSheetGesture';
import { useMapStore } from '../store/useMapStore';
import { PlaceItem } from '../types/carte';
import { PlaceContactChips } from './PlaceContactChips';
import { PlaceDetailActions } from './PlaceDetailActions';
import { PlaceDetailHeader } from './PlaceDetailHeader';
import { PlaceOpeningHours } from './PlaceOpeningHours';
import { PlacePhotoGallery } from './PlacePhotoGallery';

export interface PlaceDetailCardProps {
  place: PlaceItem;
  onClose: () => void;
  onAddToOuting?: (place: PlaceItem) => void;
  onGetDirections?: (place: PlaceItem) => void;
  expandAnim?: Animated.Value;
  hasTargetOuting?: boolean;
  targetOutingTitle?: string;
}

export const PlaceDetailCard: React.FC<PlaceDetailCardProps> = ({
  place,
  onClose,
  onAddToOuting,
  onGetDirections,
  expandAnim,
  hasTargetOuting: propHasTargetOuting,
}) => {
  const savedWaypoints = useMapStore((state) => state.savedWaypoints);
  const toggleSavedWaypoint = useMapStore((state) => state.toggleSavedWaypoint);
  const targetOutingId = useMapStore((state) => state.targetOutingId);
  const { animatedHeight, isExpanded, toggleExpand, panHandlers } = usePlaceSheetGesture(
    place.id,
    expandAnim,
  );
  const [showHours, setShowHours] = useState(false);

  const isTargetMode = propHasTargetOuting ?? !!targetOutingId;
  const isSaved = savedWaypoints.some((item) => item.id === place.id);
  const photos = place.images?.length ? place.images : place.imageUrl ? [place.imageUrl] : [];
  const hasHours = Boolean(place.openingHours && place.openingHours.length > 0);
  const showDescription =
    Boolean(place.description) && place.description?.trim() !== place.address.trim();

  return (
    <Animated.View
      {...panHandlers}
      style={[styles.card, { height: animatedHeight }, isExpanded && styles.expandedCard]}
      testID="place-detail-card"
    >
      <View style={styles.dragHandleContainer} testID="drag-handle-zone">
        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.dragHandleTouch}
          accessibilityLabel={isExpanded ? 'Réduire la fiche' : 'Agrandir la fiche'}
          accessibilityRole="button"
          testID="expand-toggle-button"
        >
          <View style={styles.dragHandle} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled
      >
        <PlaceDetailHeader
          place={place}
          isExpanded={isExpanded}
          isSaved={isSaved}
          onToggleExpand={toggleExpand}
          onToggleSaved={() => toggleSavedWaypoint(place)}
          onClose={onClose}
        />

        <PlacePhotoGallery photos={photos} placeTitle={place.title} isExpanded={isExpanded} />

        <AppText variant="h3" weight="bold" style={styles.title}>
          {place.title}
        </AppText>
        <AppText variant="bodySmall" color="secondary" style={styles.address}>
          📍 {place.address}
        </AppText>

        {place.rating > 0 ? (
          <View style={[styles.row, styles.rating]} testID="place-rating">
            <AppText variant="bodySmall">⭐</AppText>
            <AppText variant="bodySmall" weight="bold">
              {place.rating.toFixed(1)}
            </AppText>
            <AppText variant="caption" color="muted">
              ({place.reviewsCount} avis)
            </AppText>
          </View>
        ) : null}

        {isExpanded ? <PlaceContactChips phone={place.phone} website={place.website} /> : null}

        {hasHours ? (
          <PlaceOpeningHours
            hours={place.openingHours ?? []}
            expanded={showHours || isExpanded}
            onToggle={() => setShowHours(!showHours)}
          />
        ) : null}

        {showDescription ? (
          <AppText
            variant="bodySmall"
            color="secondary"
            numberOfLines={isExpanded ? undefined : 2}
            style={styles.description}
          >
            {place.description}
          </AppText>
        ) : null}

        <PlaceDetailActions
          isTargetMode={isTargetMode}
          onGetDirections={() => onGetDirections?.(place)}
          onAddToOuting={() => onAddToOuting?.(place)}
        />
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  address: {
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    elevation: 8,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  description: {
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  dragHandle: {
    backgroundColor: colors.border,
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 2,
    width: '100%',
  },
  dragHandleTouch: {
    paddingHorizontal: 30,
    paddingVertical: 6,
  },
  expandedCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  rating: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  title: {
    lineHeight: 24,
    marginBottom: 2,
  },
});
