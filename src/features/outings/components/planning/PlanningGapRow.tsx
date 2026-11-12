import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/shared/components';
import { colors, spacing } from '@/shared/constants/theme';
import { formatDuration } from '../PlannedOutingCard';
import { PlanningGap } from '../../types/planning';

export interface PlanningGapRowProps {
  gap: PlanningGap;
  testID?: string;
}

/** Segment between two steps: travel / waiting time, or a warning when they overlap. */
export const PlanningGapRow: React.FC<PlanningGapRowProps> = ({ gap, testID }) => {
  if (gap.kind === 'none') return null;
  const isOverlap = gap.kind === 'overlap';
  return (
    <View style={styles.row} testID={testID}>
      <View style={[styles.line, isOverlap ? styles.overlapLine : null]} />
      <AppText variant="caption" color={isOverlap ? 'error' : 'secondary'}>
        {isOverlap
          ? `⚠️ Chevauchement de ${formatDuration(gap.minutes)}`
          : `🚶 Trajet / attente · ${formatDuration(gap.minutes)}`}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  line: {
    backgroundColor: colors.border,
    height: 24,
    marginLeft: spacing.md,
    width: 2,
  },
  overlapLine: {
    backgroundColor: colors.error,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
