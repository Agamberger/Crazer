import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card } from '@/shared/components';
import { colors, iconSizes, radii, spacing } from '@/shared/constants/theme';
import { PLANNED_OUTING_STATUS_CONFIG, PlannedOutingRow } from '@/shared/types';
import { formatFieldTime } from '@/shared/components/DateTimeField';

export interface TimelineStepProps {
  item: PlannedOutingRow;
  isFirst: boolean;
  isLast: boolean;
  /** Si fourni, l'étape est cliquable et affiche « Modifier l'étape ». */
  onPress?: () => void;
}

const NODE_SIZE = 16;
const LINE_WIDTH = 2;

/** Une étape de la timeline : nœud + segments de ligne + carte de détail. */
export const TimelineStep: React.FC<TimelineStepProps> = ({ item, isFirst, isLast, onPress }) => {
  const status = PLANNED_OUTING_STATUS_CONFIG[item.status];
  const hasDuration = Boolean(item.duration_min && item.duration_min > 0);

  return (
    <View style={styles.row} testID={`timeline-item-${item.id}`}>
      <View style={styles.timelineColumn}>
        {!isFirst ? <View style={styles.lineTop} testID={`timeline-line-top-${item.id}`} /> : null}
        <View style={styles.node} testID={`timeline-node-${item.id}`}>
          <View style={styles.nodeInner} />
        </View>
        {!isLast ? (
          <View style={styles.lineBottom} testID={`timeline-line-bottom-${item.id}`} />
        ) : null}
      </View>

      <Card
        style={styles.card}
        onPress={onPress}
        accessibilityLabel={onPress ? `Modifier l'étape ${item.title}` : undefined}
        testID={`planned-outing-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <AppText weight="semibold" numberOfLines={1} style={styles.title}>
            {item.title}
          </AppText>
          {status ? <Badge label={`${status.emoji} ${status.label}`} tone="neutral" /> : null}
        </View>

        <View style={styles.inlineRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <AppText variant="caption" color="secondary">
            {formatFieldTime(new Date(item.scheduled_for))}
            {hasDuration ? ` • ${item.duration_min} min` : ''}
          </AppText>
        </View>

        {item.description ? (
          <AppText variant="bodySmall" color="secondary" numberOfLines={2} style={styles.spaced}>
            {item.description}
          </AppText>
        ) : null}

        {item.notes ? (
          <View style={[styles.inlineRow, styles.spaced]}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
            <AppText variant="caption" color="muted" numberOfLines={1} style={styles.notes}>
              {item.notes}
            </AppText>
          </View>
        ) : null}

        {onPress ? (
          <View style={[styles.inlineRow, styles.editHint]}>
            <AppText variant="caption" color="accent" weight="semibold">
              Modifier l&apos;étape
            </AppText>
            <Ionicons name="chevron-forward" size={iconSizes.sm - 2} color={colors.primary} />
          </View>
        ) : null}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    flex: 1,
    marginBottom: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  editHint: {
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
  },
  inlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  lineBottom: {
    backgroundColor: colors.border,
    bottom: 0,
    position: 'absolute',
    top: 20,
    width: LINE_WIDTH,
  },
  lineTop: {
    backgroundColor: colors.border,
    height: 12,
    position: 'absolute',
    top: 0,
    width: LINE_WIDTH,
  },
  node: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    height: NODE_SIZE,
    justifyContent: 'center',
    marginTop: 12,
    width: NODE_SIZE,
    zIndex: 1,
  },
  nodeInner: {
    backgroundColor: colors.primary,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  notes: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  spaced: {
    marginTop: spacing.xs,
  },
  timelineColumn: {
    alignItems: 'center',
    marginRight: spacing.sm,
    position: 'relative',
    width: 20,
  },
  title: {
    flex: 1,
  },
});
