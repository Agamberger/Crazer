import React, { useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { useFriends } from '../hooks/useFriends';
import { UserSearchResult } from '../types';
import { UserListItem } from './UserListItem';
import { UserProfileDetailModal } from './UserProfileDetailModal';
import { UserSearchInput } from './UserSearchInput';

export interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 24);
  const bottomPadding = Math.max(insets.bottom, 16);

  const {
    searchResults,
    friends,
    searchQuery,
    isSearching,
    error,
    pendingRequests,
    searchUsers,
    setSearchQuery,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriendship,
    resetSearch,
  } = useFriends();

  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  const handleClose = () => {
    setSelectedUser(null);
    resetSearch();
    onClose();
  };

  const handleClear = () => {
    resetSearch();
  };

  const currentSelectedUserInResults = selectedUser
    ? searchResults.find((u) => u.id === selectedUser.id) ||
      friends.find((u) => u.id === selectedUser.id) ||
      pendingRequests.find((u) => u.id === selectedUser.id) ||
      selectedUser
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
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
        testID="modal-user-search"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Mes Amis & Recherche</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityLabel="Fermer la fenêtre d amitié"
            accessibilityRole="button"
            testID="btn-close-search-modal"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <UserSearchInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchUsers(text);
            }}
            onClear={handleClear}
            placeholder="Rechercher par nom ou email..."
          />
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {searchQuery.trim().length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Résultats ({searchResults.length})
              </Text>
              {isSearching ? (
                <Text style={styles.emptyText}>Recherche en cours...</Text>
              ) : searchResults.length === 0 ? (
                <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <UserListItem
                      user={item}
                      onPressSelect={() => setSelectedUser(item)}
                      onAddFriend={() => sendFriendRequest(item.id)}
                      onAcceptRequest={() => acceptFriendRequest(item.friendshipId || '')}
                      onRemoveFriend={() => removeFriendship(item.friendshipId || '')}
                    />
                  )}
                />
              )}
            </View>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Demandes en attente ({pendingRequests.length})
                  </Text>
                  <FlatList
                    data={pendingRequests}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <UserListItem
                        user={item}
                        onPressSelect={() => setSelectedUser(item)}
                        onAcceptRequest={() => acceptFriendRequest(item.friendshipId || '')}
                        onRemoveFriend={() => removeFriendship(item.friendshipId || '')}
                      />
                    )}
                  />
                </View>
              )}

              <View style={styles.section} testID="friends-list-section">
                <Text style={styles.sectionTitle}>Mes Amis ({friends.length})</Text>
                {friends.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyTitle}>Vous n&apos;avez pas encore d&apos;amis</Text>
                    <Text style={styles.emptySubtitle}>
                      Utilisez la barre de recherche ci-dessus pour trouver des amis par nom ou email.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <UserListItem
                        user={item}
                        onPressSelect={() => setSelectedUser(item)}
                        onRemoveFriend={() => removeFriendship(item.friendshipId || '')}
                      />
                    )}
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>

        <UserProfileDetailModal
          visible={!!selectedUser}
          user={currentSelectedUserInResults}
          onClose={() => setSelectedUser(null)}
          onAddFriend={(userId) => sendFriendRequest(userId)}
          onAcceptRequest={(friendshipId) => acceptFriendRequest(friendshipId)}
          onRemoveFriend={(friendshipId) => removeFriendship(friendshipId)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  errorContainer: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
});
