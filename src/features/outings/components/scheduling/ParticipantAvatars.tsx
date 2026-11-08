import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Avatar } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingMember } from '../../types/scheduling';
import { countPendingResponses } from '../../utils/availabilityUtils';

export interface ParticipantAvatarsProps {
  members: OutingMember[];
  /** Max avatars shown before « +n ». */
  maxAvatars?: number;
  testID?: string;
}

/** Avatars of the people coming, with « 3 participants · 1 en attente ». Hidden without members. */
export const ParticipantAvatars: React.FC<ParticipantAvatarsProps> = ({
  members,
  maxAvatars = 4,
  testID = 'participant-avatars',
}) => {
  const attending = members.filter((m) => m.status === 'accepted' || m.status === 'maybe');
  if (attending.length === 0) return null;

  const pending = countPendingResponses(members);
  const shown = attending.slice(0, maxAvatars);
  const hidden = attending.length - shown.length;
  const summary = `${attending.length} participant${attending.length > 1 ? 's' : ''}${
    pending > 0 ? ` · ${pending} en attente` : ''
  }`;

  return (
    <View style={styles.row} testID={testID} accessibilityLabel={summary}>
      {shown.map((member) => (
        <Avatar key={member.userId} name={member.displayName} imageUrl={member.avatarUrl} size="xs" />
      ))}
      {hidden > 0 ? (
        <AppText variant="caption" color="secondary">
          +{hidden}
        </AppText>
      ) : null}
      <AppText variant="caption" color="secondary" style={styles.summary}>
        {summary}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  summary: {
    marginLeft: spacing.xs,
  },
});
