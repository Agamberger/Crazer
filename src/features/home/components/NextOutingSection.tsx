import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingCard } from '@/features/outings/components/OutingCard';
import { OutingRow } from '@/shared/types';

export interface NextOutingSectionProps {
  outing: OutingRow | null;
  onOpenOuting: (outing: OutingRow) => void;
  onSeeAll: () => void;
  onCreateOuting: () => void;
}

/** Bloc « Prochaine sortie » de l'accueil, avec un état vide qui invite à en créer une. */
export const NextOutingSection: React.FC<NextOutingSectionProps> = ({
  outing,
  onOpenOuting,
  onSeeAll,
  onCreateOuting,
}) => (
  <View style={styles.container} testID="home-next-outing">
    <SectionHeader
      title="Prochaine sortie"
      actionLabel={outing ? 'Voir tout' : undefined}
      onAction={outing ? onSeeAll : undefined}
    />
    {outing ? (
      <OutingCard
        outing={outing}
        onPress={() => onOpenOuting(outing)}
        testID="home-next-outing-card"
      />
    ) : (
      <EmptyState
        icon="calendar-outline"
        title="Aucune sortie prévue"
        description="Lance une sortie et invite tes amis !"
        actionLabel="Organiser une sortie"
        onAction={onCreateOuting}
        testID="home-next-outing-empty"
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
});
