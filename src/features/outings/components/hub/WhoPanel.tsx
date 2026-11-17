import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AppModal, Button, InlineAlert } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';
import { useInviteFriends } from '../../hooks/useInviteFriends';
import { useMyAnswer } from '../../hooks/useMyAnswer';
import { OutingMember, OutingScheduling } from '../../types/scheduling';
import { InviteFriendsStep } from '../scheduling/InviteFriendsStep';
import { MembersList } from '../scheduling/MembersList';
import { MyAnswerSection } from './MyAnswerSection';

export interface WhoPanelProps {
  visible: boolean;
  onClose: () => void;
  outing: OutingRow;
  members: OutingMember[];
  scheduling: OutingScheduling | null;
  userId: string | null;
  isOrganizer: boolean;
}

/**
 * « Qui ? » panel of the hub: members with their answer; a member answers (or changes their
 * answer), the organizer invites more friends.
 */
export const WhoPanel: React.FC<WhoPanelProps> = ({
  visible,
  onClose,
  outing,
  members,
  scheduling,
  userId,
  isOrganizer,
}) => {
  const invitation = useInviteFriends(outing, members, visible && isOrganizer);
  const myAnswer = useMyAnswer(outing, scheduling, userId, isOrganizer);
  const count = invitation.selectedIds.length;

  const footer =
    isOrganizer && count > 0 ? (
      <Button
        title={`Inviter ${count} ami${count > 1 ? 's' : ''}`}
        fullWidth
        loading={invitation.isInviting}
        onPress={() => void invitation.invite()}
        style={styles.footerButton}
        testID="btn-hub-invite"
      />
    ) : undefined;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      variant="slideOver"
      title="Qui ?"
      footer={footer}
      testID="hub-who-panel"
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {myAnswer.myStatus ? (
          <MyAnswerSection
            myStatus={myAnswer.myStatus}
            onAnswer={(response) => void myAnswer.answer(response)}
            disabled={myAnswer.isSaving}
            feedback={myAnswer.feedback}
          />
        ) : null}
        <MembersList members={members} />
        {invitation.feedback ? (
          <InlineAlert
            tone={invitation.feedback.tone}
            message={invitation.feedback.message}
            testID="hub-invite-feedback"
          />
        ) : null}
        {isOrganizer ? (
          <InviteFriendsStep
            heading="Inviter des amis"
            description="Ils recevront une invitation à rejoindre la sortie."
            emptyTitle="Personne d'autre à inviter"
            emptyDescription="Tous tes amis sont déjà invités."
            friends={invitation.invitableFriends}
            selectedIds={invitation.selectedIds}
            onChange={invitation.setSelectedIds}
            isLoading={invitation.isLoadingFriends}
          />
        ) : null}
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  footerButton: {
    flex: 1,
  },
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
