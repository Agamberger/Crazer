import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { useFriends } from '../hooks/useFriends';
import { UserListItem } from './UserListItem';
import { UserSearchInput } from './UserSearchInput';

export interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({ visible, onClose }) => {
  const {
    searchResults,
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

  const handleClose = () => {
    resetSearch();
    onClose();
  };

  const handleClear = () => {
    resetSearch();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={styles.container} testID="modal-user-search">
        <View style={styles.header}>
          <Text style={styles.title}>Rechercher des amis</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            accessibilityLabel="Fermer la fenêtre de recherche"
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
          <View style={styles.content}>
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Demandes reçues ({pendingRequests.length})</Text>
                <FlatList
                  data={pendingRequests}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <UserListItem
                      user={item}
                      onAcceptRequest={acceptFriendRequest}
                      onRemoveFriend={removeFriendship}
                    />
                  )}
                />
              </View>
            )}
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>Trouvez vos amis sur Crazer</Text>
              <Text style={styles.emptySubtitle}>
                Saisissez un prénom, un nom ou une adresse email pour rechercher des utilisateurs et les ajouter à vos amis.
              </Text>
            </View>
          </View>
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
                onAddFriend={sendFriendRequest}
                onAcceptRequest={acceptFriendRequest}
                onRemoveFriend={removeFriendship}
                onCancelRequest={removeFriendship}
              />
            )}
          />
        )}
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
