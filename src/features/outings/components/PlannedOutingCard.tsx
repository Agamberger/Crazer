import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card } from '@/shared/components';
import { colors, iconSizes, radii, spacing } from '@/shared/constants/theme';
import { PLANNED_OUTING_STATUS_CONFIG, PlannedOutingRow } from '@/shared/types';

export interface PlannedOutingCardProps {
  plannedOuting: PlannedOutingRow;
  stepIndex?: number;
  onPress?: () => void;
}

/** Formate une durée en minutes : 90 → « 1h30 », 120 → « 2h », 45 → « 45 min ». */
export const formatDuration = (mins: number | null): string | null => {
  if (!mins || mins <= 0) return null;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours > 0 && remainingMins > 0)
    return `${hours}h${remainingMins.toString().padStart(2, '0')}`;
  if (hours > 0) return `${hours}h`;
  return `${mins} min`;
};

export const PlannedOutingCard: React.FC<PlannedOutingCardProps> = ({
  plannedOuting,
  stepIndex,
  onPress,
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
    ? scheduledDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const statusConfig = PLANNED_OUTING_STATUS_CONFIG[plannedOuting.status] || {
    label: plannedOuting.status,
    emoji: '📌',
  };
  const durationStr = formatDuration(plannedOuting.duration_min);

  return (
    <Card
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={onPress ? `Modifier l'étape ${plannedOuting.title}` : undefined}
      testID={`planned-outing-card-${plannedOuting.id}`}
    >
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          {stepIndex !== undefined ? (
            <Badge label={`#${stepIndex + 1}`} style={styles.stepBadge} />
          ) : null}
          <AppText weight="bold" numberOfLines={2} style={styles.title}>
            {plannedOuting.title}
          </AppText>
        </View>
        <View style={styles.headerRight}>
          <Badge
            label={`${statusConfig.emoji} ${statusConfig.label}`}
            tone="neutral"
            testID="planned-outing-status-badge"
          />
          {onPress ? (
            <Ionicons
              name="chevron-forward"
              size={iconSizes.sm}
              color={colors.textMuted}
              style={styles.chevron}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        {isValidDate ? (
          <Badge
            label={`🕒 ${formattedDate ? `${formattedDate} à ` : ''}${formattedTime}`}
            tone="neutral"
          />
        ) : null}
        {durationStr ? <Badge label={`⏱️ ${durationStr}`} tone="neutral" /> : null}
      </View>

      {plannedOuting.description ? (
        <AppText variant="bodySmall" color="secondary" numberOfLines={3} style={styles.description}>
          {plannedOuting.description}
        </AppText>
      ) : null}

      {plannedOuting.notes ? (
        <View style={styles.notesContainer}>
          <AppText variant="caption" color="muted" numberOfLines={2} style={styles.notesText}>
            💬 {plannedOuting.notes}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  chevron: {
    marginLeft: spacing.xs / 2,
  },
  description: {
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  notesContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.sm - 2,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  notesText: {
    fontStyle: 'italic',
  },
  stepBadge: {
    alignSelf: 'center',
    marginRight: spacing.xs,
  },
  title: {
    flex: 1,
  },
  titleWrapper: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
});
