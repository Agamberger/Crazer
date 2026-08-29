import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  PanResponder,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { PlaceItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';

export interface PlaceDetailCardProps {
  place: PlaceItem;
  onClose: () => void;
  onAddToOuting?: (place: PlaceItem) => void;
  onGetDirections?: (place: PlaceItem) => void;
  expandAnim?: Animated.Value;
  hasTargetOuting?: boolean;
  targetOutingTitle?: string;
}

const OPEN_BADGE_BG = 'rgba(34, 197, 94, 0.15)';
const CLOSED_BADGE_BG = 'rgba(239, 68, 68, 0.15)';

const CATEGORY_LABELS: Record<string, { name: string; badgeColor: string }> = {
  resto: { name: 'Restaurant', badgeColor: colors.secondary },
  bar: { name: 'Bar & Lounge', badgeColor: colors.accent },
  activite: { name: 'Activité', badgeColor: colors.primary },
  nature: { name: 'Outdoor', badgeColor: colors.success },
  culture: { name: 'Culture', badgeColor: colors.warning },
  all: { name: 'Lieu', badgeColor: colors.primary },
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const COLLAPSED_HEIGHT = 270;
const EXPANDED_HEIGHT = Math.max(300, SCREEN_HEIGHT - 280);

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

  const isTargetMode = propHasTargetOuting ?? !!targetOutingId;

  const [showHours, setShowHours] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const isExpandedRef = useRef<boolean>(false);
  isExpandedRef.current = isExpanded;

  const animatedHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const startHeightRef = useRef<number>(COLLAPSED_HEIGHT);

  const isSaved = savedWaypoints.some((item) => item.id === place.id);
  const catInfo = CATEGORY_LABELS[place.category] || CATEGORY_LABELS.all;

  // Réinitialiser la hauteur lors du changement de lieu
  useEffect(() => {
    setIsExpanded(false);
    animatedHeight.setValue(COLLAPSED_HEIGHT);
    if (expandAnim) expandAnim.setValue(0);
  }, [place.id, animatedHeight, expandAnim]);

  const updateExpandProgress = (height: number) => {
    if (expandAnim) {
      const progress = (height - COLLAPSED_HEIGHT) / (EXPANDED_HEIGHT - COLLAPSED_HEIGHT);
      const clampedProgress = Math.min(Math.max(progress, 0), 1);
      expandAnim.setValue(clampedProgress);
    }
  };

  const animateToHeight = (targetHeight: number, callback?: () => void) => {
    const targetProgress = targetHeight === EXPANDED_HEIGHT ? 1 : 0;
    if (expandAnim) {
      Animated.parallel([
        Animated.spring(animatedHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          bounciness: 4,
        }),
        Animated.spring(expandAnim, {
          toValue: targetProgress,
          useNativeDriver: false,
          bounciness: 4,
        }),
      ]).start(callback);
    } else {
      Animated.spring(animatedHeight, {
        toValue: targetHeight,
        useNativeDriver: false,
        bounciness: 4,
      }).start(callback);
    }
  };

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    animateToHeight(nextState ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
  };

  // PanResponder capturant le glissement vertical progressif sur toute la carte
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dy) > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderGrant: () => {
        startHeightRef.current = isExpandedRef.current
          ? EXPANDED_HEIGHT
          : COLLAPSED_HEIGHT;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = startHeightRef.current - gestureState.dy;
        const clampedHeight = Math.min(
          Math.max(newHeight, COLLAPSED_HEIGHT),
          EXPANDED_HEIGHT
        );
        animatedHeight.setValue(clampedHeight);
        updateExpandProgress(clampedHeight);

        const midPoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;
        if (clampedHeight > midPoint && !isExpandedRef.current) {
          setIsExpanded(true);
        } else if (clampedHeight <= midPoint && isExpandedRef.current) {
          setIsExpanded(false);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalHeight = startHeightRef.current - gestureState.dy;
        const midPoint = (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2;

        const shouldExpand =
          gestureState.vy < -0.3 ||
          (gestureState.vy <= 0.3 && finalHeight > midPoint);

        const targetHeight = shouldExpand ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
        setIsExpanded(shouldExpand);
        animateToHeight(targetHeight);
      },
    })
  ).current;

  const photos =
    place.images && place.images.length > 0
      ? place.images
      : place.imageUrl
      ? [place.imageUrl]
      : [];

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const handleCallPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        { height: animatedHeight },
        isExpanded && styles.expandedCard,
      ]}
      testID="place-detail-card"
    >
      {/* Poignée tactile de drag */}
      <View style={styles.dragHandleContainer} testID="drag-handle-zone">
        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.dragHandleTouch}
          accessibilityLabel={
            isExpanded ? 'Réduire la fiche' : 'Agrandir la fiche'
          }
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
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: catInfo.badgeColor }]}>
              <Text style={styles.badgeText}>{catInfo.name}</Text>
            </View>
            <Text style={styles.priceTag}>{place.priceRange}</Text>
            {place.isOpenNow !== undefined && (
              <View
                style={[
                  styles.openStatusBadge,
                  place.isOpenNow ? styles.openBadge : styles.closedBadge,
                ]}
              >
                <Text style={styles.openStatusText}>
                  {place.isOpenNow ? '🟢 Ouvert' : '🔴 Fermé'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={toggleExpand}
              accessibilityLabel={isExpanded ? 'Réduire' : 'Plein écran'}
              accessibilityRole="button"
              testID="expand-button"
            >
              <Text style={styles.iconText}>{isExpanded ? '▼' : '▲'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => toggleSavedWaypoint(place)}
              accessibilityLabel={
                isSaved ? 'Retirer des enregistrés' : 'Enregistrer le lieu'
              }
              accessibilityRole="button"
              testID="bookmark-button"
            >
              <Text style={styles.iconText}>{isSaved ? '★' : '☆'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onClose}
              accessibilityLabel="Fermer la fiche d'information"
              accessibilityRole="button"
              testID="close-button"
            >
              <Text style={styles.iconText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Galerie de photos */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.photosContainer, isExpanded && styles.expandedPhotosContainer]}
            contentContainerStyle={styles.photosContent}
            testID="place-photos-gallery"
          >
            {photos.map((url, idx) => (
              <Image
                key={`${url}-${idx}`}
                source={{ uri: url }}
                style={[styles.photoThumb, isExpanded && styles.expandedPhotoThumb]}
                resizeMode="cover"
                accessibilityLabel={`Photo ${idx + 1} de ${place.title}`}
              />
            ))}
          </ScrollView>
        )}

        <Text style={styles.title}>{place.title}</Text>
        <Text style={styles.address}>📍 {place.address}</Text>

        <View style={styles.ratingRow}>
          <Text style={styles.starIcon}>⭐</Text>
          <Text style={styles.ratingValue}>{place.rating.toFixed(1)}</Text>
          <Text style={styles.reviewsCount}>({place.reviewsCount} avis)</Text>
        </View>

        {/* Boutons de contact rapides en mode étendu */}
        {isExpanded && (place.phone || place.website) && (
          <View style={styles.contactRow} testID="contact-buttons-row">
            {place.phone && (
              <TouchableOpacity
                style={styles.contactChip}
                onPress={() => handleCallPhone(place.phone!)}
                accessibilityLabel="Appeler l'établissement"
                accessibilityRole="button"
              >
                <Text style={styles.contactChipText}>📞 {place.phone}</Text>
              </TouchableOpacity>
            )}
            {place.website && (
              <TouchableOpacity
                style={styles.contactChip}
                onPress={() => handleOpenLink(place.website!)}
                accessibilityLabel="Visiter le site internet"
                accessibilityRole="button"
              >
                <Text style={styles.contactChipText}>🌐 Site Web</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Section Horaires d'ouverture */}
        {place.openingHours && place.openingHours.length > 0 && (
          <View style={styles.hoursContainer} testID="opening-hours-section">
            <TouchableOpacity
              style={styles.hoursHeader}
              onPress={() => setShowHours(!showHours)}
              accessibilityLabel="Afficher ou masquer les horaires d'ouverture"
              accessibilityRole="button"
            >
              <Text style={styles.hoursTitle}>{"🕒 Horaires d'ouverture"}</Text>
              <Text style={styles.hoursChevron}>
                {showHours || isExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {(showHours || isExpanded) && (
              <View style={styles.hoursList} testID="opening-hours-list">
                {place.openingHours.map((dayText, idx) => (
                  <Text key={idx} style={styles.hourItemText}>
                    {dayText}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {place.description && place.description.trim() !== place.address.trim() ? (
          <Text
            style={styles.description}
            numberOfLines={isExpanded ? undefined : 2}
          >
            {place.description}
          </Text>
        ) : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => onGetDirections && onGetDirections(place)}
            accessibilityLabel="Lancer l'itinéraire"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>🗺️ Itinéraire</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => onAddToOuting && onAddToOuting(place)}
            accessibilityLabel={
              isTargetMode ? 'Ajouter ce lieu à la sortie' : 'Ajouter ce lieu à une sortie'
            }
            accessibilityRole="button"
            testID="add-to-outing-button"
          >
            <Text style={styles.primaryButtonText}>
              {isTargetMode ? '+ Ajouter à la sortie' : '+ Ajouter à une sortie'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  address: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
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
    backgroundColor: CLOSED_BADGE_BG,
  },
  contactChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  contactChipText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
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
  expandedPhotoThumb: {
    height: 110,
    width: 150,
  },
  expandedPhotosContainer: {
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  hourItemText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 18,
  },
  hoursChevron: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  hoursContainer: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  hoursHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  hoursList: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  hoursTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  openBadge: {
    backgroundColor: OPEN_BADGE_BG,
  },
  openStatusBadge: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  openStatusText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  photoThumb: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    height: 72,
    width: 96,
  },
  photosContainer: {
    marginBottom: spacing.sm,
  },
  photosContent: {
    gap: spacing.xs,
  },
  priceTag: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  ratingValue: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  reviewsCount: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  starIcon: {
    fontSize: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    lineHeight: 24,
    marginBottom: 2,
  },
});
