import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import {
  PLANNED_OUTING_STATUS_CONFIG,
  PlannedOutingRow,
} from '@/shared/types';

export interface PlannedOutingsTimelineProps {
  plannedOutings: PlannedOutingRow[];
  isLoading?: boolean;
  onSelectPlannedOuting?: (plannedOuting: PlannedOutingRow) => void;
  onAddPlannedOuting?: () => void;
  canEdit?: boolean;
}

export const PlannedOutingsTimeline: React.FC<PlannedOutingsTimelineProps> = ({
  plannedOutings,
  isLoading = false,
  onSelectPlannedOuting,
  onAddPlannedOuting,
  canEdit = true,
}) => {
  // Sort chronologically by scheduled_for
  const sortedOutings = [...plannedOutings].sort(
    (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
  );

  return (
    <View style={styles.container} testID="planned-outings-timeline">
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>Étapes de la sortie</Text>
          <Text style={styles.badgeCount}>{sortedOutings.length}</Text>
        </View>
        {canEdit && onAddPlannedOuting && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddPlannedOuting}
            accessibilityLabel="Ajouter une étape"
            accessibilityRole="button"
            testID="btn-add-planned-outing"
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={styles.addButtonText}>Ajouter</Text>
          </TouchableOpacity>
        )}
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
            Ajoutez des étapes pour construire l&apos;itinéraire et le programme de la sortie !
          </Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {sortedOutings.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedOutings.length - 1;

            return (
              <View key={item.id} style={styles.timelineItem} testID={`timeline-item-${item.id}`}>
                {/* Vertical continuity timeline line with node indicator */}
                <View style={styles.timelineColumn}>
                  {/* Top connector line segment */}
                  {!isFirst && <View style={styles.lineTop} testID={`timeline-line-top-${item.id}`} />}

                  {/* Chronological timeline node */}
                  <View style={styles.node} testID={`timeline-node-${item.id}`}>
                    <View style={styles.nodeInner} />
                  </View>

                  {/* Bottom connector line segment */}
                  {!isLast && <View style={styles.lineBottom} testID={`timeline-line-bottom-${item.id}`} />}
                </View>

                {/* Timeline item content card */}
                <TouchableOpacity
                  style={styles.cardContent}
                  disabled={!canEdit || !onSelectPlannedOuting}
                  onPress={() => onSelectPlannedOuting?.(item)}
                  activeOpacity={0.7}
                  testID={`planned-outing-card-${item.id}`}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: colors.surfaceLight,
                        },
                      ]}
                    >
                      <Text style={styles.statusEmoji}>
                        {PLANNED_OUTING_STATUS_CONFIG[item.status]?.emoji}
                      </Text>
                      <Text style={styles.statusLabel}>
                        {PLANNED_OUTING_STATUS_CONFIG[item.status]?.label}
                      </Text>
                    </View>
                  </View>

                  {/* Scheduled time info */}
                  <View style={styles.scheduleInfo}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.scheduleText}>
                      {new Date(item.scheduled_for).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {item.duration_min && item.duration_min > 0 && (
                      <Text style={styles.durationText}>
                        • {item.duration_min} min
                      </Text>
                    )}
                  </View>

                  {/* Description if present */}
                  {item.description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Notes if present */}
                  {item.notes ? (
                    <View style={styles.notesContainer}>
                      <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.notesText} numberOfLines={1}>
                        {item.notes}
                      </Text>
                    </View>
                  ) : null}

                  {/* Edit hint chevron */}
                  {canEdit && onSelectPlannedOuting && (
                    <View style={styles.editHintRow}>
                      <Text style={styles.editHintText}>Modifier l&apos;étape</Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  badgeCount: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cardContent: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  durationText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  editHintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  editHintText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 4,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  itemTitle: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.xs,
  },
  lineBottom: {
    backgroundColor: colors.border,
    bottom: 0,
    position: 'absolute',
    top: 20,
    width: 2,
  },
  lineTop: {
    backgroundColor: colors.border,
    height: 12,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  node: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    justifyContent: 'center',
    marginTop: 12,
    width: 16,
    zIndex: 1,
  },
  nodeInner: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  notesContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  notesText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: typography.fontSizes.xs,
  },
  scheduleInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.xs,
  },
  scheduleText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusEmoji: {
    fontSize: 10,
  },
  statusLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  timelineColumn: {
    alignItems: 'center',
    marginRight: spacing.sm,
    position: 'relative',
    width: 20,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineList: {
    marginTop: spacing.xs,
  },
});
