import { useCallback } from 'react';
import { useAuth } from '@/features/auth';
import { useFriendsStore } from '../store/useFriendsStore';

export function useFriends() {
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || '';

  const searchResults = useFriendsStore((state) => state.searchResults);
  const friends = useFriendsStore((state) => state.friends);
  const pendingRequests = useFriendsStore((state) => state.pendingRequests);
  const searchQuery = useFriendsStore((state) => state.searchQuery);
  const isSearching = useFriendsStore((state) => state.isSearching);
  const isLoading = useFriendsStore((state) => state.isLoading);
  const error = useFriendsStore((state) => state.error);

  const setSearchQuery = useFriendsStore((state) => state.setSearchQuery);
  const searchUsersStore = useFriendsStore((state) => state.searchUsers);
  const sendFriendRequestStore = useFriendsStore((state) => state.sendFriendRequest);
  const acceptFriendRequestStore = useFriendsStore((state) => state.acceptFriendRequest);
  const removeFriendshipStore = useFriendsStore((state) => state.removeFriendship);
  const fetchFriendsListStore = useFriendsStore((state) => state.fetchFriendsList);
  const resetSearch = useFriendsStore((state) => state.resetSearch);

  const searchUsers = useCallback(
    (query: string) => {
      return searchUsersStore(query, currentUserId);
    },
    [searchUsersStore, currentUserId]
  );

  const sendFriendRequest = useCallback(
    (targetUserId: string) => {
      return sendFriendRequestStore(currentUserId, targetUserId);
    },
    [sendFriendRequestStore, currentUserId]
  );

  const acceptFriendRequest = useCallback(
    (friendshipId: string) => {
      return acceptFriendRequestStore(friendshipId, currentUserId);
    },
    [acceptFriendRequestStore, currentUserId]
  );

  const removeFriendship = useCallback(
    (friendshipId: string, targetUserId: string) => {
      return removeFriendshipStore(friendshipId, targetUserId);
    },
    [removeFriendshipStore]
  );

  const fetchFriendsList = useCallback(() => {
    if (!currentUserId) return Promise.resolve();
    return fetchFriendsListStore(currentUserId);
  }, [fetchFriendsListStore, currentUserId]);

  return {
    currentUserId,
    searchResults,
    friends,
    pendingRequests,
    searchQuery,
    isSearching,
    isLoading,
    error,
    setSearchQuery,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriendship,
    fetchFriendsList,
    resetSearch,
  };
}
