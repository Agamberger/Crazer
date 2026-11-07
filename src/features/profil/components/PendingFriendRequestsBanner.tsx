import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, Card } from '@/shared/components';
import { colors, spacing } from '@/shared/constants/theme';
import { UserSearchResult } from '../types';
import { getUserDisplayName } from '../utils/userDisplay';

export interface PendingFriendRequestsBannerProps {
  pendingRequests: UserSearchResult[];
  onAccept: (friendshipId: string) => void;
  onReject: (friendshipId: string, userId: string) => void;
}

const REQUEST_CARD_WIDTH = 290;

export const PendingFriendRequestsBanner: React.FC<PendingFriendRequestsBannerProps> = ({
  pendingRequests,
  onAccept,
  onReject,
}) => {
  const [isHidden, setIsHidden] = useState(false);

  if (isHidden || !pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  const count = pendingRequests.length;

  return (
    <Card style={styles.container} testID="pending-friend-requests-banner">
      <View style={styles.header}>
        <AppText variant="caption" weight="bold">
          {`📩 Demande${count > 1 ? 's' : ''} d'ami en attente (${count})`}
        </AppText>
        <Button
          title="Masquer"
          leftIcon="close"
          variant="ghost"
          size="sm"
          style={styles.hideButton}
          onPress={() => setIsHidden(true)}
          accessibilityLabel="Masquer les demandes d'ami"
          testID="btn-hide-friend-banner"
        />
      </View>

      <FlatList
        data={pendingRequests}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        testID="pending-friend-requests-carousel"
        renderItem={({ item }) => (
          <View style={styles.requestCard} testID={`banner-request-item-${item.id}`}>
            <View style={styles.userInfo}>
              <Avatar
                name={item.fullName}
                fallback={getUserDisplayName(item)}
                imageUrl={item.avatarUrl}
                style={styles.avatar}
              />
              <View style={styles.userText}>
                <AppText variant="bodySmall" weight="semibold" numberOfLines={1}>
                  {getUserDisplayName(item)}
                </AppText>
                <AppText variant="caption" color="secondary" numberOfLines={1}>
                  souhaite vous ajouter en ami
                </AppText>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <Button
                title="Accepter"
                size="sm"
                style={styles.actionBtn}
                onPress={() => item.friendshipId && onAccept(item.friendshipId)}
                testID={`btn-banner-accept-${item.id}`}
              />
              <Button
                title="Refuser"
                variant="outline"
                size="sm"
                style={styles.actionBtn}
                onPress={() => item.friendshipId && onReject(item.friendshipId, item.id)}
                testID={`btn-banner-reject-${item.id}`}
              />
            </View>
          </View>
        )}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  actionBtn: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  avatar: {
    marginRight: spacing.sm,
  },
  container: {
    borderColor: colors.primary,
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
  hideButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  requestCard: {
    width: REQUEST_CARD_WIDTH,
  },
  userInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  userText: {
    flex: 1,
  },
});
