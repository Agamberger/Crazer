import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EmptyState, SectionHeader } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingCard } from '@/features/outings/components/OutingCard';
import { ParticipantAvatars } from '@/features/outings/components/scheduling/ParticipantAvatars';
import { OutingMember } from '@/features/outings/types/scheduling';
import { OutingRow } from '@/shared/types';

export interface NextOutingSectionProps {
  outing: OutingRow | null;
  /** Participants of the highlighted outing (avatars under the card). */
  members?: OutingMember[];
  onOpenOuting: (outing: OutingRow) => void;
  onSeeAll: () => void;
  onCreateOuting: () => void;
}

/** Bloc « Prochaine sortie » de l'accueil, avec un état vide qui invite à en créer une. */
export const NextOutingSection: React.FC<NextOutingSectionProps> = ({
  outing,
  members = [],
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
      <>
        <OutingCard
          outing={outing}
          onPress={() => onOpenOuting(outing)}
          testID="home-next-outing-card"
        />
        <ParticipantAvatars members={members} testID="home-next-outing-participants" />
      </>
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
