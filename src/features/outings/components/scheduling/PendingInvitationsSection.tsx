import React from 'react';
import { View } from 'react-native';
import { SectionHeader } from '@/shared/components';
import { OutingInvitation } from '../../types/scheduling';
import { InvitationCard } from './InvitationCard';

export interface PendingInvitationsSectionProps {
  invitations: OutingInvitation[];
  onOpenInvitation: (invitation: OutingInvitation) => void;
}

/** « Invitations » section (home, Sorties tab); hidden when empty. */
export const PendingInvitationsSection: React.FC<PendingInvitationsSectionProps> = ({
  invitations,
  onOpenInvitation,
}) => {
  if (invitations.length === 0) return null;
  return (
    <View testID="pending-invitations">
      <SectionHeader title={`Invitations (${invitations.length})`} />
      {invitations.map((invitation) => (
        <InvitationCard
          key={invitation.outing.id}
          invitation={invitation}
          onPress={onOpenInvitation}
        />
      ))}
    </View>
  );
};
