import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import {
  PLANNED_OUTING_STATUS_CONFIG,
  PlannedOutingRow,
} from '@/shared/types';

export interface PlannedOutingCardProps {
  plannedOuting: PlannedOutingRow;
  stepIndex?: number;
}

export const PlannedOutingCard: React.FC<PlannedOutingCardProps> = ({
  plannedOuting,
  stepIndex,
}) => {
  const scheduledDate = new Date(plannedOuting.scheduled_for);
  const isValidDate = !isNaN(scheduledDate.getTime());

  const formattedDate = isValidDate
    ? scheduledDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';

  const formattedTime = isValidDate
    ? scheduledDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const statusConfig = PLANNED_OUTING_STATUS_CONFIG[plannedOuting.status] || {
    label: plannedOuting.status,
    emoji: '📌',
  };

  const formatDuration = (mins: number | null) => {
    if (!mins || mins <= 0) return null;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0 && remainingMins > 0) {
      return `${hours}h${remainingMins.toString().padStart(2, '0')}`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${mins} min`;
  };

  const durationStr = formatDuration(plannedOuting.duration_min);

  return (
    <Card style={styles.card} testID={`planned-outing-card-${plannedOuting.id}`}>
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          {stepIndex !== undefined && (
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>#{stepIndex + 1}</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {plannedOuting.title}
          </Text>
        </View>
        <View style={styles.statusBadge} testID="planned-outing-status-badge">
          <Text style={styles.statusBadgeText}>
            {statusConfig.emoji} {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {isValidDate && (
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>
              🕒 {formattedDate ? `${formattedDate} à ` : ''}{formattedTime}
            </Text>
          </View>
        )}
        {durationStr && (
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>⏱️ {durationStr}</Text>
          </View>
        )}
      </View>

      {plannedOuting.description ? (
        <Text style={styles.description} numberOfLines={3}>
          {plannedOuting.description}
        </Text>
      ) : null}

      {plannedOuting.notes ? (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText} numberOfLines={2}>
            💬 {plannedOuting.notes}
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: spacing.md,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  metaItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  metaText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  notesContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  notesText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontStyle: 'italic',
  },
  statusBadge: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  stepBadge: {
    backgroundColor: colors.primaryDark,
    borderRadius: 6,
    marginRight: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stepBadgeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  titleWrapper: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
});
