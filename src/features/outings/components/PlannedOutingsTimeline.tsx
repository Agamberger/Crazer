import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { PlannedOutingRow } from '@/shared/types';
import { PlannedOutingCard } from './PlannedOutingCard';

export interface PlannedOutingsTimelineProps {
  plannedOutings: PlannedOutingRow[];
  onAddPlannedOuting: () => void | Promise<void>;
  isLoading?: boolean;
  isAdding?: boolean;
}

export const PlannedOutingsTimeline: React.FC<PlannedOutingsTimelineProps> = ({
  plannedOutings,
  onAddPlannedOuting,
  isLoading = false,
  isAdding = false,
}) => {
  // Tri par scheduled_for chronologique ascendant
  const sortedOutings = [...plannedOutings].sort(
    (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  );

  return (
    <View style={styles.container} testID="planned-outings-timeline">
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Étapes de la sortie</Text>
        <Text style={styles.badgeCount}>{sortedOutings.length}</Text>
      </View>

      {isLoading && sortedOutings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des étapes...</Text>
        </View>
      ) : sortedOutings.length === 0 ? (
        <View style={styles.emptyContainer} testID="planned-outings-empty">
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>Aucune étape planifiée</Text>
          <Text style={styles.emptySubtitle}>
            Ajoutez des étapes pour construire l'itinéraire et le programme de la sortie !
          </Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {sortedOutings.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedOutings.length - 1;

            return (
              <View key={item.id} style={styles.timelineItem} testID={`timeline-item-${item.id}`}>
                {/* Barre verticale de continuité avec connecteur et point */}
                <View style={styles.timelineColumn}>
                  {/* Segment supérieur du fil conducteur */}
                  {!isFirst && <View style={styles.lineTop} testID={`timeline-line-top-${item.id}`} />}

                  {/* Nœud / point chronologique */}
                  <View style={styles.node} testID={`timeline-node-${item.id}`}>
                    <View style={styles.nodeInner} />
                  </View>

                  {/* Segment inférieur du fil conducteur */}
                  {!isLast && <View style={styles.lineBottom} testID={`timeline-line-bottom-${item.id}`} />}
                </View>

                {/* Carte de l'étape */}
                <View style={styles.cardWrapper}>
                  <PlannedOutingCard plannedOuting={item} stepIndex={index} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Bouton d'ajout d'étape en bas */}
      <View style={styles.actionContainer}>
        <Button
          title="+ Ajouter une étape"
          variant="outline"
          size="md"
          loading={isAdding}
          onPress={onAddPlannedOuting}
          testID="btn-add-planned-outing"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionContainer: {
    marginTop: spacing.md,
  },
  badgeCount: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardWrapper: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  container: {
    marginTop: spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  lineBottom: {
    backgroundColor: colors.primary,
    bottom: 0,
    position: 'absolute',
    top: 24,
    width: 2,
  },
  lineTop: {
    backgroundColor: colors.primary,
    height: 24,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  node: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    justifyContent: 'center',
    marginTop: 16,
    width: 16,
    zIndex: 2,
  },
  nodeInner: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  timelineColumn: {
    alignItems: 'center',
    position: 'relative',
    width: 28,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineList: {
    width: '100%',
  },
});
