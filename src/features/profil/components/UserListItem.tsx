import React from 'react';
import { StyleSheet } from 'react-native';
import { Avatar, Button, ButtonVariant, ListItem } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { UserSearchResult } from '../types';
import { getUserDisplayName } from '../utils/userDisplay';

export interface UserListItemProps {
  user: UserSearchResult;
  onPressSelect?: (user: UserSearchResult) => void;
  onAddFriend?: (userId: string) => void;
  onAcceptRequest?: (friendshipId: string) => void;
  onRemoveFriend?: (friendshipId: string, userId: string) => void;
  onCancelRequest?: (friendshipId: string, userId: string) => void;
}

interface FriendAction {
  title: string;
  variant: ButtonVariant;
  accessibilityLabel: string;
  onPress: () => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({
  user,
  onPressSelect,
  onAddFriend,
  onAcceptRequest,
  onRemoveFriend,
  onCancelRequest,
}) => {
  const displayName = getUserDisplayName(user);
  const { friendshipId } = user;

  const getAction = (): FriendAction => {
    switch (user.friendshipStatus) {
      case 'accepted':
        return {
          title: 'Ami ✓',
          variant: 'outline',
          accessibilityLabel: `Retirer ${displayName} des amis`,
          onPress: () => friendshipId && onRemoveFriend?.(friendshipId, user.id),
        };
      case 'pending_sent':
        return {
          title: 'En attente',
          variant: 'secondary',
          accessibilityLabel: `Annuler la demande d'ami à ${displayName}`,
          onPress: () => friendshipId && onCancelRequest?.(friendshipId, user.id),
        };
      case 'pending_received':
        return {
          title: 'Accepter',
          variant: 'primary',
          accessibilityLabel: `Accepter la demande d'ami de ${displayName}`,
          onPress: () => friendshipId && onAcceptRequest?.(friendshipId),
        };
      case 'none':
      case 'rejected':
      default:
        return {
          title: 'Ajouter',
          variant: 'primary',
          accessibilityLabel: `Ajouter ${displayName} en ami`,
          onPress: () => onAddFriend?.(user.id),
        };
    }
  };

  const action = getAction();

  return (
    <ListItem
      bordered
      title={displayName}
      subtitle={user.email ?? undefined}
      left={<Avatar name={user.fullName} fallback={displayName} imageUrl={user.avatarUrl} />}
      onPress={() => onPressSelect?.(user)}
      showChevron={false}
      accessibilityLabel={`Voir le profil de ${displayName}`}
      testID={`user-profile-touchable-${user.id}`}
      right={
        <Button
          title={action.title}
          variant={action.variant}
          size="sm"
          style={styles.actionButton}
          onPress={action.onPress}
          accessibilityLabel={action.accessibilityLabel}
          testID={`btn-friend-status-${user.id}`}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  actionButton: {
    paddingHorizontal: spacing.sm,
  },
});
