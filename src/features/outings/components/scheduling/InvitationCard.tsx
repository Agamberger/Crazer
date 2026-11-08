import React from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Card } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingInvitation } from '../../types/scheduling';

export interface InvitationCardProps {
  invitation: OutingInvitation;
  onPress: (invitation: OutingInvitation) => void;
}

/** A pending invitation: « Invité par X » + outing name. */
export const InvitationCard: React.FC<InvitationCardProps> = React.memo(({ invitation, onPress }) => (
  <Card
    onPress={() => onPress(invitation)}
    style={styles.card}
    accessibilityRole="button"
    accessibilityLabel={`Invitation de ${invitation.organizerName} : ${invitation.outing.title}`}
    testID={`invitation-${invitation.outing.id}`}
  >
    <AppText variant="caption" color="accent">
      ✉️ Invité par {invitation.organizerName}
    </AppText>
    <AppText weight="semibold">{invitation.outing.title}</AppText>
    <AppText variant="caption" color="secondary">
      Réponds et donne tes dispos
    </AppText>
  </Card>
));
InvitationCard.displayName = 'InvitationCard';

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs / 2,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
});
