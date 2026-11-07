import React, { useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText, Badge, Button, Chip, IconButton } from '@/shared/components';
import { colors, radii, spacing } from '@/shared/constants/theme';
import { getPlaceCategoryLabel } from '../constants';
import { usePlaceSheetGesture } from '../hooks/usePlaceSheetGesture';
import { useMapStore } from '../store/useMapStore';
import { PlaceItem } from '../types/carte';
import { PlaceOpeningHours } from './PlaceOpeningHours';

export interface PlaceDetailCardProps {
  place: PlaceItem;
  onClose: () => void;
  onAddToOuting?: (place: PlaceItem) => void;
  onGetDirections?: (place: PlaceItem) => void;
  expandAnim?: Animated.Value;
  hasTargetOuting?: boolean;
  targetOutingTitle?: string;
}

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

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
  const catInfo = getPlaceCategoryLabel(place.category);
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
              onPress={toggleExpand}
              accessibilityLabel={isExpanded ? 'Réduire' : 'Plein écran'}
              testID="expand-button"
            />
            <IconButton
              icon={isSaved ? 'star' : 'star-outline'}
              size="sm"
              color={isSaved ? colors.warning : undefined}
              onPress={() => toggleSavedWaypoint(place)}
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

        {photos.length > 0 ? (
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
                accessibilityLabel={`Photo ${idx + 1} de ${place.title}`}
              />
            ))}
          </ScrollView>
        ) : null}

        <AppText variant="h3" weight="bold" style={styles.title}>
          {place.title}
        </AppText>
        <AppText variant="bodySmall" color="secondary" style={styles.address}>
          📍 {place.address}
        </AppText>

        <View style={[styles.row, styles.rating]}>
          <AppText variant="bodySmall">⭐</AppText>
          <AppText variant="bodySmall" weight="bold">
            {place.rating.toFixed(1)}
          </AppText>
          <AppText variant="caption" color="muted">
            ({place.reviewsCount} avis)
          </AppText>
        </View>

        {isExpanded && (place.phone || place.website) ? (
          <View style={styles.contactRow} testID="contact-buttons-row">
            {place.phone ? (
              <Chip
                label={place.phone}
                emoji="📞"
                onPress={() => openUrl(`tel:${place.phone}`)}
                accessibilityLabel="Appeler l'établissement"
              />
            ) : null}
            {place.website ? (
              <Chip
                label="Site Web"
                emoji="🌐"
                onPress={() => place.website && openUrl(place.website)}
                accessibilityLabel="Visiter le site internet"
              />
            ) : null}
          </View>
        ) : null}

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

        <View style={styles.actionsRow}>
          <Button
            title="🗺️ Itinéraire"
            variant="outline"
            size="sm"
            onPress={() => onGetDirections?.(place)}
            accessibilityLabel="Lancer l'itinéraire"
            style={styles.actionButton}
          />
          <Button
            title={isTargetMode ? '+ Ajouter à la sortie' : '+ Ajouter à une sortie'}
            size="sm"
            onPress={() => onAddToOuting?.(place)}
            accessibilityLabel={
              isTargetMode ? 'Ajouter ce lieu à la sortie' : 'Ajouter ce lieu à une sortie'
            }
            style={styles.actionButton}
            testID="add-to-outing-button"
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
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
  closedBadge: {
    backgroundColor: colors.errorBackground,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  openBadge: {
    backgroundColor: colors.successBackground,
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
  price: {
    marginLeft: spacing.xs,
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
