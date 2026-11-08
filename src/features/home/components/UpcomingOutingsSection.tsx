import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ListItem, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';
import { formatUpcomingDate } from '../utils/homeUtils';

export interface UpcomingOutingsSectionProps {
  /** Outings still to come, already sorted and capped (see `getUpcomingOutings`). */
  outings: OutingRow[];
  onOpenOuting: (outing: OutingRow) => void;
  onCreateOuting: () => void;
}

/** Bloc « À venir » de l'accueil : les prochaines sorties après la première, avec « + Sortie ». */
export const UpcomingOutingsSection: React.FC<UpcomingOutingsSectionProps> = ({
  outings,
  onOpenOuting,
  onCreateOuting,
}) => {
  if (outings.length === 0) return null;

  return (
    <View style={styles.container} testID="home-upcoming-outings">
      <SectionHeader title="À venir" actionLabel="+ Sortie" onAction={onCreateOuting} />
      {/* Capped at a handful of rows (see UPCOMING_OUTINGS_LIMIT): no virtualized list needed. */}
      {outings.map((outing) => (
        <ListItem
          key={outing.id}
          bordered
          title={outing.title}
          subtitle={formatUpcomingDate(outing.start_date)}
          icon="calendar-outline"
          onPress={() => onOpenOuting(outing)}
          style={styles.item}
          testID={`home-upcoming-${outing.id}`}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  item: {
    marginBottom: spacing.xs,
  },
});
