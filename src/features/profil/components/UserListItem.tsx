import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { UserSearchResult } from '../types';

export interface UserListItemProps {
  user: UserSearchResult;
  onAddFriend?: (userId: string) => void;
  onAcceptRequest?: (friendshipId: string) => void;
  onRemoveFriend?: (friendshipId: string, userId: string) => void;
  onCancelRequest?: (friendshipId: string, userId: string) => void;
}

export const UserListItem: React.FC<UserListItemProps> = ({
  user,
  onAddFriend,
  onAcceptRequest,
  onRemoveFriend,
  onCancelRequest,
}) => {
  const getInitials = (name: string | null, email: string) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const displayName = user.fullName || user.email.split('@')[0];

  const renderActionButton = () => {
    switch (user.friendshipStatus) {
      case 'accepted':
        return (
          <Button
            title="Ami ✓"
            variant="outline"
            style={styles.actionButton}
            onPress={() => user.friendshipId && onRemoveFriend?.(user.friendshipId, user.id)}
            accessibilityLabel={`Retirer ${displayName} des amis`}
            testID={`btn-friend-status-${user.id}`}
          />
        );
      case 'pending_sent':
        return (
          <Button
            title="En attente"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => user.friendshipId && onCancelRequest?.(user.friendshipId, user.id)}
            accessibilityLabel={`Annuler la demande d'ami à ${displayName}`}
            testID={`btn-friend-status-${user.id}`}
          />
        );
      case 'pending_received':
        return (
          <Button
            title="Accepter"
            variant="primary"
            style={styles.actionButton}
            onPress={() => user.friendshipId && onAcceptRequest?.(user.friendshipId)}
            accessibilityLabel={`Accepter la demande d'ami de ${displayName}`}
            testID={`btn-friend-status-${user.id}`}
          />
        );
      case 'none':
      case 'rejected':
      default:
        return (
          <Button
            title="Ajouter"
            variant="primary"
            style={styles.actionButton}
            onPress={() => onAddFriend?.(user.id)}
            accessibilityLabel={`Ajouter ${displayName} en ami`}
            testID={`btn-friend-status-${user.id}`}
          />
        );
    }
  };

  return (
    <View style={styles.container} testID={`user-item-${user.id}`}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(user.fullName, user.email)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.email} numberOfLines={1}>
          {user.email}
        </Text>
      </View>
      {renderActionButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 40,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  email: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});
