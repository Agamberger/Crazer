import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { UserSearchResult } from '../types';

export interface PendingFriendRequestsBannerProps {
  pendingRequests: UserSearchResult[];
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string, userId: string) => void;
}

export const PendingFriendRequestsBanner: React.FC<PendingFriendRequestsBannerProps> = ({
  pendingRequests,
  onAccept,
  onReject,
}) => {
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden || !pendingRequests || pendingRequests.length === 0) {
    return null;
  }

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

  return (
    <View style={styles.container} testID="pending-friend-requests-banner">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {`📩 Demande${pendingRequests.length > 1 ? 's' : ''} d'ami en attente (${pendingRequests.length})`}
        </Text>
        <TouchableOpacity
          onPress={() => setIsHidden(true)}
          style={styles.closeButton}
          accessibilityLabel="Masquer les demandes d'ami"
          accessibilityRole="button"
          testID="btn-hide-friend-banner"
        >
          <Text style={styles.closeText}>✕ Masquer</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={pendingRequests}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        testID="pending-friend-requests-carousel"
        renderItem={({ item }) => {
          const displayName = item.fullName || item.email.split('@')[0];
          return (
            <View style={styles.requestCard} testID={`banner-request-item-${item.id}`}>
              <View style={styles.userInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(item.fullName, item.email)}</Text>
                </View>
                <View style={styles.userTextContainer}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <Text style={styles.userSubtext} numberOfLines={1}>
                    souhaite vous ajouter en ami
                  </Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Button
                  title="Accepter"
                  variant="primary"
                  style={styles.actionBtn}
                  onPress={() => item.friendshipId && onAccept(item.friendshipId)}
                  testID={`btn-banner-accept-${item.id}`}
                />
                <Button
                  title="Refuser"
                  variant="outline"
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => item.friendshipId && onReject(item.friendshipId, item.id)}
                  testID={`btn-banner-reject-${item.id}`}
                />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  closeButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    overflow: 'hidden',
    padding: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  listContent: {
    paddingVertical: 2,
  },
  rejectBtn: {
    borderColor: colors.border,
  },
  requestCard: {
    width: 290,
  },
  userInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  userSubtext: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  userTextContainer: {
    flex: 1,
  },
});
