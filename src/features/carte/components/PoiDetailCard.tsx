import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { PoiItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';

export interface PoiDetailCardProps {
  poi: PoiItem;
  onClose: () => void;
  onAddToOuting?: (poi: PoiItem) => void;
  onGetDirections?: (poi: PoiItem) => void;
}

const CATEGORY_LABELS: Record<string, { name: string; badgeColor: string }> = {
  resto: { name: 'Restaurant', badgeColor: '#FF7675' },
  bar: { name: 'Bar & Lounge', badgeColor: '#FD79A8' },
  activite: { name: 'Activité', badgeColor: '#6C5CE7' },
  nature: { name: 'Outdoor', badgeColor: '#00B894' },
  culture: { name: 'Culture', badgeColor: '#FDCB6E' },
  all: { name: 'Lieu', badgeColor: colors.primary },
};

export const PoiDetailCard: React.FC<PoiDetailCardProps> = ({
  poi,
  onClose,
  onAddToOuting,
  onGetDirections,
}) => {
  const savedWaypoints = useMapStore((state) => state.savedWaypoints);
  const toggleSavedWaypoint = useMapStore((state) => state.toggleSavedWaypoint);

  const isSaved = savedWaypoints.some((item) => item.id === poi.id);
  const catInfo = CATEGORY_LABELS[poi.category] || CATEGORY_LABELS.all;

  return (
    <View style={styles.card} testID="poi-detail-card">
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, { backgroundColor: catInfo.badgeColor }]}>
            <Text style={styles.badgeText}>{catInfo.name}</Text>
          </View>
          <Text style={styles.priceTag}>{poi.priceRange}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => toggleSavedWaypoint(poi)}
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

      <Text style={styles.title}>{poi.title}</Text>
      <Text style={styles.address}>📍 {poi.address}</Text>

      <View style={styles.ratingRow}>
        <Text style={styles.starIcon}>⭐</Text>
        <Text style={styles.ratingValue}>{poi.rating.toFixed(1)}</Text>
        <Text style={styles.reviewsCount}>({poi.reviewsCount} avis)</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {poi.description}
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => onGetDirections && onGetDirections(poi)}
          accessibilityLabel="Lancer l'itinéraire"
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>🗺️ Itinéraire</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => onAddToOuting && onAddToOuting(poi)}
          accessibilityLabel="Ajouter ce lieu à une sortie"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>+ Ajouter à la sortie</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  priceTag: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.xs,
  },
  address: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  starIcon: {
    fontSize: typography.fontSizes.xs,
    marginRight: 4,
  },
  ratingValue: {
    color: colors.warning,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginRight: 4,
  },
  reviewsCount: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
});
