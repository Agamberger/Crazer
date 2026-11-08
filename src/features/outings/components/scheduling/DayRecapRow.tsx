import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, Card, formatTimeLabel } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { DayRecap } from '../../types/scheduling';
import { formatDayLabel } from '../../utils/availabilityUtils';

export interface DayRecapRowProps {
  recap: DayRecap;
  /** Shown to the organizer only, when the day has a common slot. */
  onChooseDay?: (recap: DayRecap) => void;
}

/** One candidate day: who is available and the common slot. */
export const DayRecapRow: React.FC<DayRecapRowProps> = ({ recap, onChooseDay }) => {
  const { commonSlot, availableMembers } = recap;
  const slotLabel = commonSlot
    ? `${formatTimeLabel(commonSlot.start)} – ${formatTimeLabel(commonSlot.end)}`
    : availableMembers.length > 0
      ? 'Pas de créneau commun'
      : 'Personne de dispo';

  return (
    <Card style={styles.card} testID={`day-recap-${recap.day}`}>
      <View style={styles.header}>
        <AppText weight="semibold" style={styles.day}>
          {formatDayLabel(recap.day)}
        </AppText>
        <AppText color={commonSlot ? 'accent' : 'muted'} testID={`day-recap-slot-${recap.day}`}>
          {slotLabel}
        </AppText>
      </View>
      <View
        style={styles.avatars}
        accessibilityLabel={`Disponibles : ${availableMembers.map((m) => m.displayName).join(', ') || 'personne'}`}
      >
        {availableMembers.map((member) => (
          <Avatar key={member.userId} name={member.displayName} imageUrl={member.avatarUrl} size="xs" />
        ))}
        <AppText variant="caption" color="secondary">
          {availableMembers.length} dispo{availableMembers.length > 1 ? 's' : ''}
        </AppText>
      </View>
      {onChooseDay && commonSlot ? (
        <Button
          title="Choisir ce jour"
          size="sm"
          variant="secondary"
          onPress={() => onChooseDay(recap)}
          testID={`btn-choose-day-${recap.day}`}
        />
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  avatars: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  day: {
    textTransform: 'capitalize',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
