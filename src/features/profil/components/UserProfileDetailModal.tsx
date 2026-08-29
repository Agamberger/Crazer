import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { UserSearchResult } from '../types';

export interface UserProfileDetailModalProps {
  user: UserSearchResult | null;
  visible: boolean;
  onClose: () => void;
  onAddFriend?: (userId: string) => void;
  onAcceptRequest?: (friendshipId: string) => void;
  onRemoveFriend?: (friendshipId: string, userId: string) => void;
  onCancelRequest?: (friendshipId: string, userId: string) => void;
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
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 24);
  const bottomPadding = Math.max(insets.bottom, 16);

  if (!user) return null;

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

  const renderFriendshipAction = () => {
    switch (user.friendshipStatus) {
      case 'accepted':
        return (
          <Button
            title="Ami sur Crazer ✓"
            variant="outline"
            style={styles.actionButton}
            onPress={() => user.friendshipId && onRemoveFriend?.(user.friendshipId, user.id)}
            accessibilityLabel={`Retirer ${displayName} des amis`}
            testID="btn-detail-remove-friend"
          />
        );
      case 'pending_sent':
        return (
          <Button
            title="Demande envoyée (Annuler)"
            variant="secondary"
            style={styles.actionButton}
            onPress={() => user.friendshipId && onCancelRequest?.(user.friendshipId, user.id)}
            accessibilityLabel={`Annuler la demande d'ami à ${displayName}`}
            testID="btn-detail-cancel-request"
          />
        );
      case 'pending_received':
        return (
          <Button
            title="Accepter la demande d'ami"
            variant="primary"
            style={styles.actionButton}
            onPress={() => user.friendshipId && onAcceptRequest?.(friendshipIdForAccept())}
            accessibilityLabel={`Accepter la demande d'ami de ${displayName}`}
            testID="btn-detail-accept-request"
          />
        );
      case 'none':
      case 'rejected':
      default:
        return (
          <Button
            title="+ Ajouter en ami"
            variant="primary"
            style={styles.actionButton}
            onPress={() => onAddFriend?.(user.id)}
            accessibilityLabel={`Ajouter ${displayName} en ami`}
            testID="btn-detail-add-friend"
          />
        );
    }
  };

  const friendshipIdForAccept = () => user.friendshipId || '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: topPadding + spacing.sm,
            paddingBottom: bottomPadding,
          },
        ]}
        testID="modal-user-profile-detail"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
            accessibilityLabel="Retour à la liste"
            accessibilityRole="button"
            testID="btn-close-profile-detail"
          >
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{"Profil de l'utilisateur"}</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.profileCard}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>{getInitials(user.fullName, user.email)}</Text>
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Statut</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>
                  {user.friendshipStatus === 'accepted'
                    ? 'Ami'
                    : user.friendshipStatus === 'pending_sent'
                    ? 'Demande envoyée'
                    : user.friendshipStatus === 'pending_received'
                    ? 'Demande reçue'
                    : 'Non connecté'}
                </Text>
              </View>
            </View>

            <View style={styles.actionContainer}>{renderFriendshipAction()}</View>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    width: '100%',
  },
  actionContainer: {
    marginTop: spacing.md,
    width: '100%',
  },
  avatarLarge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 80,
  },
  avatarLargeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.md,
    width: '100%',
  },
  email: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerRightPlaceholder: {
    width: 60,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    width: '100%',
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs / 2,
  },
  profileCard: {
    alignItems: 'center',
    borderColor: colors.border,
    padding: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.md,
  },
  statusBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  statusBadgeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
});
