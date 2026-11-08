import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Avatar } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { PARTICIPANT_STATUS_CONFIG } from '@/shared/types';
import { OutingMember } from '../../types/scheduling';

export interface MembersListProps {
  members: OutingMember[];
}

/** « Qui vient ? » — participants with their answer. */
export const MembersList: React.FC<MembersListProps> = ({ members }) => (
  <View style={styles.container} accessibilityLabel="Participants">
    {members.map((member) => {
      const status = PARTICIPANT_STATUS_CONFIG[member.status];
      return (
        <View key={member.userId} style={styles.row} testID={`member-${member.userId}`}>
          <Avatar name={member.displayName} imageUrl={member.avatarUrl} size="sm" />
          <AppText style={styles.name}>
            {member.displayName}
            {member.isOrganizer ? ' (organisateur)' : ''}
          </AppText>
          <AppText variant="caption" color="secondary">
            {status.emoji} {status.label}
          </AppText>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  name: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
