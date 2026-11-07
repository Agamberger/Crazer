import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  AppModal,
  AppText,
  Avatar,
  Badge,
  Button,
  ButtonVariant,
  Card,
  Divider,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { FriendStatus, UserSearchResult } from '../types';
import { getUserDisplayName } from '../utils/userDisplay';

export interface UserProfileDetailModalProps {
  user: UserSearchResult | null;
  visible: boolean;
  onClose: () => void;
  onAddFriend?: (userId: string) => void;
  onAcceptRequest?: (friendshipId: string) => void;
  onRemoveFriend?: (friendshipId: string, userId: string) => void;
  onCancelRequest?: (friendshipId: string, userId: string) => void;
}

const STATUS_LABELS: Record<FriendStatus, string> = {
  accepted: 'Ami',
  pending_sent: 'Demande envoyée',
  pending_received: 'Demande reçue',
  rejected: 'Non connecté',
  none: 'Non connecté',
};

interface DetailAction {
  title: string;
  variant: ButtonVariant;
  accessibilityLabel: string;
  testID: string;
  onPress: () => void;
}

export const UserProfileDetailModal: React.FC<UserProfileDetailModalProps> = ({
  user,
  visible,
  onClose,
  onAddFriend,
  onAcceptRequest,
  onRemoveFriend,
  onCancelRequest,
}) => {
  if (!user) return null;

  const displayName = getUserDisplayName(user);
  const friendshipId = user.friendshipId || '';

  const getAction = (): DetailAction => {
    switch (user.friendshipStatus) {
      case 'accepted':
        return {
          title: 'Ami sur Crazer ✓',
          variant: 'outline',
          accessibilityLabel: `Retirer ${displayName} des amis`,
          testID: 'btn-detail-remove-friend',
          onPress: () => friendshipId && onRemoveFriend?.(friendshipId, user.id),
        };
      case 'pending_sent':
        return {
          title: 'Demande envoyée (Annuler)',
          variant: 'secondary',
          accessibilityLabel: `Annuler la demande d'ami à ${displayName}`,
          testID: 'btn-detail-cancel-request',
          onPress: () => friendshipId && onCancelRequest?.(friendshipId, user.id),
        };
      case 'pending_received':
        return {
          title: "Accepter la demande d'ami",
          variant: 'primary',
          accessibilityLabel: `Accepter la demande d'ami de ${displayName}`,
          testID: 'btn-detail-accept-request',
          onPress: () => friendshipId && onAcceptRequest?.(friendshipId),
        };
      case 'none':
      case 'rejected':
      default:
        return {
          title: '+ Ajouter en ami',
          variant: 'primary',
          accessibilityLabel: `Ajouter ${displayName} en ami`,
          testID: 'btn-detail-add-friend',
          onPress: () => onAddFriend?.(user.id),
        };
    }
  };

  const { title, ...actionProps } = getAction();

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      variant="fullScreen"
      title="Profil de l'utilisateur"
      closeIcon="arrow-back"
      closeAccessibilityLabel="Retour à la liste"
      closeButtonTestID="btn-close-profile-detail"
      testID="modal-user-profile-detail"
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.profileCard}>
          <Avatar
            name={user.fullName}
            fallback={displayName}
            imageUrl={user.avatarUrl}
            size="xl"
            style={styles.avatar}
          />
          <AppText variant="h3" weight="bold" style={styles.name}>
            {displayName}
          </AppText>
          {user.email ? (
            <AppText variant="bodySmall" color="secondary">
              {user.email}
            </AppText>
          ) : null}

          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <AppText variant="bodySmall" color="muted">
              Statut
            </AppText>
            <Badge label={STATUS_LABELS[user.friendshipStatus]} tone="neutral" />
          </View>

          <Button title={title} fullWidth style={styles.actionButton} {...actionProps} />
        </Card>
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    marginTop: spacing.md,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  divider: {
    alignSelf: 'stretch',
  },
  infoRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    marginBottom: spacing.xs / 2,
  },
  profileCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
});
