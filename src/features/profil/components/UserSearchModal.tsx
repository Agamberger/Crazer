import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppModal,
  AppText,
  EmptyState,
  InlineAlert,
  SearchBar,
  SectionHeader,
} from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { useFriends } from '../hooks/useFriends';
import { UserSearchResult } from '../types';
import { UserListItem } from './UserListItem';
import { UserProfileDetailModal } from './UserProfileDetailModal';

export interface UserSearchModalProps {
  visible: boolean;
  onClose: () => void;
}

const keyExtractor = (item: UserSearchResult) => item.id;

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

  const handleChangeText = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const currentSelectedUser = selectedUser
    ? searchResults.find((u) => u.id === selectedUser.id) ||
      friends.find((u) => u.id === selectedUser.id) ||
      pendingRequests.find((u) => u.id === selectedUser.id) ||
      selectedUser
    : null;

  const renderUserList = (
    data: UserSearchResult[],
    options: { canAdd?: boolean; canAccept?: boolean },
  ) => (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <UserListItem
          user={item}
          onPressSelect={() => setSelectedUser(item)}
          onAddFriend={options.canAdd ? () => sendFriendRequest(item.id) : undefined}
          onAcceptRequest={
            options.canAccept ? () => acceptFriendRequest(item.friendshipId || '') : undefined
          }
          onRemoveFriend={() => removeFriendship(item.friendshipId || '', item.id)}
        />
      )}
    />
  );

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      variant="fullScreen"
      title="Mes Amis & Recherche"
      closeAccessibilityLabel="Fermer la fenêtre d'amitié"
      closeButtonTestID="btn-close-search-modal"
      testID="modal-user-search"
    >
      <SearchBar
        value={searchQuery}
        onChangeText={handleChangeText}
        onClear={resetSearch}
        loading={isSearching}
        placeholder="Rechercher par nom ou email..."
        accessibilityLabel="Champ de recherche d'utilisateurs"
        testID="input-user-search"
      />

      <View style={styles.spacer} />
      {error ? <InlineAlert message={error} /> : null}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {hasQuery ? (
          <View style={styles.section}>
            <SectionHeader title={`Résultats (${searchResults.length})`} />
            {isSearching ? (
              <AppText variant="bodySmall" color="muted" align="center" style={styles.emptyText}>
                Recherche en cours...
              </AppText>
            ) : searchResults.length === 0 ? (
              <AppText variant="bodySmall" color="muted" align="center" style={styles.emptyText}>
                Aucun utilisateur trouvé
              </AppText>
            ) : (
              renderUserList(searchResults, { canAdd: true, canAccept: true })
            )}
          </View>
        ) : (
          <>
            {pendingRequests.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={`Demandes en attente (${pendingRequests.length})`} />
                {renderUserList(pendingRequests, { canAccept: true })}
              </View>
            ) : null}

            <View style={styles.section} testID="friends-list-section">
              <SectionHeader title={`Mes Amis (${friends.length})`} />
              {friends.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="Vous n'avez pas encore d'amis"
                  description="Utilisez la barre de recherche ci-dessus pour trouver des amis par nom ou email."
                  testID="friends-empty-state"
                />
              ) : (
                renderUserList(friends, {})
              )}
            </View>
          </>
        )}
      </ScrollView>

      <UserProfileDetailModal
        visible={!!selectedUser}
        user={currentSelectedUser}
        onClose={() => setSelectedUser(null)}
        onAddFriend={(userId) => sendFriendRequest(userId)}
        onAcceptRequest={(friendshipId) => acceptFriendRequest(friendshipId)}
        onRemoveFriend={(friendshipId) =>
          removeFriendship(friendshipId, currentSelectedUser?.id || '')
        }
      />
    </AppModal>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  emptyText: {
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  spacer: {
    height: spacing.md,
  },
});
