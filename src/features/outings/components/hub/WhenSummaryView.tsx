import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Chip } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { WhenSummary } from '../../types/hub';
import { formatDayLabel } from '../../utils/availabilityUtils';

export interface WhenSummaryViewProps {
  summary: WhenSummary;
}

/** Max candidate days shown before « +n ». */
const MAX_DAYS_SHOWN = 3;

/** Summary of « Quand ? »: the chosen date, else the candidate days as chips. */
export const WhenSummaryView: React.FC<WhenSummaryViewProps> = ({ summary }) => {
  if (summary.kind === 'date') {
    return (
      <AppText color="accent" weight="semibold" testID="hub-when-date">
        📅 {summary.label}
      </AppText>
    );
  }
  if (summary.kind === 'empty') {
    return (
      <AppText color="secondary" testID="hub-when-empty">
        Aucun jour proposé
      </AppText>
    );
  }

  const hidden = summary.days.length - MAX_DAYS_SHOWN;
  const common = summary.daysWithCommonSlot;
  return (
    <>
      <View style={styles.chips} testID="hub-when-days">
        {summary.days.slice(0, MAX_DAYS_SHOWN).map((day) => (
          <Chip key={day} label={formatDayLabel(day)} />
        ))}
        {hidden > 0 ? <Chip label={`+${hidden}`} /> : null}
      </View>
      <AppText variant="caption" color="secondary">
        {common > 0
          ? `${common} jour${common > 1 ? 's' : ''} avec un créneau commun`
          : 'Pas encore de créneau commun'}
      </AppText>
    </>
  );
};

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
