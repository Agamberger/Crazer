import React, { useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container} testID="modal-user-search">
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
            isSearching={isSearching}
          />
        </View>

        {error && (
          <View style={styles.errorBanner} testID="search-error-banner">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {searchQuery.trim().length === 0 ? (
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {pendingRequests.length > 0 && (
              <View style={styles.section} testID="pending-requests-section">
                <Text style={styles.sectionTitle}>📩 Demandes reçues ({pendingRequests.length})</Text>
                {pendingRequests.map((item) => (
                  <UserListItem
                    key={item.id}
                    user={item}
                    onPressSelect={(u) => setSelectedUser(u)}
                    onAcceptRequest={acceptFriendRequest}
                    onRemoveFriend={removeFriendship}
                  />
                ))}
              </View>
            )}

            {friends.length > 0 && (
              <View style={styles.section} testID="friends-list-section">
                <Text style={styles.sectionTitle}>👥 Mes Amis ({friends.length})</Text>
                {friends.map((item) => (
                  <UserListItem
                    key={item.id}
                    user={item}
                    onPressSelect={(u) => setSelectedUser(u)}
                    onRemoveFriend={removeFriendship}
                  />
                ))}
              </View>
            )}

            {pendingRequests.length === 0 && friends.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Trouvez vos amis sur Crazer</Text>
                <Text style={styles.emptySubtitle}>
                  Saisissez un prénom, un nom ou une adresse email pour rechercher des utilisateurs, consulter leur profil et les ajouter à vos amis.
                </Text>
              </View>
            )}
          </ScrollView>
        ) : searchResults.length === 0 && !isSearching ? (
          <View style={styles.emptyState} testID="no-results-state">
            <Text style={styles.emptyIcon}>🙁</Text>
            <Text style={styles.emptyTitle}>Aucun utilisateur trouvé</Text>
            <Text style={styles.emptySubtitle}>
              Aucun profil ne correspond à {'"'}
              {searchQuery}
              {'"'}. Vérifiez l orthographe ou essayez un autre terme.
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            testID="search-results-list"
            renderItem={({ item }) => (
              <UserListItem
                user={item}
                onPressSelect={(u) => setSelectedUser(u)}
                onAddFriend={sendFriendRequest}
                onAcceptRequest={acceptFriendRequest}
                onRemoveFriend={removeFriendship}
                onCancelRequest={removeFriendship}
              />
            )}
          />
        )}

        <UserProfileDetailModal
          user={currentSelectedUserInResults}
          visible={selectedUser !== null}
          onClose={() => setSelectedUser(null)}
          onAddFriend={sendFriendRequest}
          onAcceptRequest={acceptFriendRequest}
          onRemoveFriend={removeFriendship}
          onCancelRequest={removeFriendship}
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
    paddingTop: spacing.xl,
  },
  content: {
    flex: 1,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  errorBanner: {
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
    marginBottom: spacing.sm,
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
  },
  listContainer: {
    paddingBottom: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
});
