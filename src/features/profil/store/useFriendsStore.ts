import { create } from 'zustand';
import { bindSetToSession, registerUserScopedStore } from '@/shared/store/sessionReset';
import { friendsService } from '../services/friendsService';
import { UserSearchResult } from '../types';

interface FriendsState {
  searchResults: UserSearchResult[];
  friends: UserSearchResult[];
  pendingRequests: UserSearchResult[];
  searchQuery: string;
  isSearching: boolean;
  isLoading: boolean;
  error: string | null;

  setSearchQuery: (query: string) => void;
  searchUsers: (query: string, currentUserId: string) => Promise<void>;
  sendFriendRequest: (currentUserId: string, targetUserId: string) => Promise<void>;
  acceptFriendRequest: (friendshipId: string, currentUserId: string) => Promise<void>;
  removeFriendship: (friendshipId: string, targetUserId: string) => Promise<void>;
  fetchFriendsList: (currentUserId: string) => Promise<void>;
  resetSearch: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  searchResults: [],
  friends: [],
  pendingRequests: [],
  searchQuery: '',
  isSearching: false,
  isLoading: false,
  error: null,

  setSearchQuery: (query) => set({ searchQuery: query }),

  searchUsers: async (query, currentUserId) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    const trimmed = query.trim();
    setLive({ searchQuery: query });

    if (!trimmed) {
      setLive({ searchResults: [], isSearching: false, error: null });
      return;
    }

    setLive({ isSearching: true, error: null });
    // Une réponse lente ne doit pas écraser les résultats d'une saisie plus récente.
    const isStale = () => get().searchQuery !== query;
    try {
      const results = await friendsService.searchUsers(trimmed, currentUserId);
      if (isStale()) return;
      setLive({ searchResults: results, isSearching: false });
    } catch (err: unknown) {
      if (isStale()) return;
      const message = err instanceof Error ? err.message : 'Erreur de recherche';
      setLive({ searchResults: [], isSearching: false, error: message });
    }
  },

  sendFriendRequest: async (currentUserId, targetUserId) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ error: null });
    try {
      const friendshipId = await friendsService.sendFriendRequest(currentUserId, targetUserId);

      // Mise à jour réactive des résultats de recherche
      const updatedResults = get().searchResults.map((user) => {
        if (user.id === targetUserId) {
          return {
            ...user,
            friendshipStatus: 'pending_sent' as const,
            friendshipId,
          };
        }
        return user;
      });

      setLive({ searchResults: updatedResults });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande";
      setLive({ error: message });
    }
  },

  acceptFriendRequest: async (friendshipId, currentUserId) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ error: null });
    try {
      await friendsService.acceptFriendRequest(friendshipId);

      // Mettre à jour la liste d'amis et résultats de recherche
      const updatedResults = get().searchResults.map((user) => {
        if (user.friendshipId === friendshipId) {
          return {
            ...user,
            friendshipStatus: 'accepted' as const,
          };
        }
        return user;
      });

      setLive({ searchResults: updatedResults });
      await get().fetchFriendsList(currentUserId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur d'acceptation";
      setLive({ error: message });
    }
  },

  removeFriendship: async (friendshipId, targetUserId) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ error: null });
    try {
      await friendsService.removeFriendship(friendshipId);

      const updatedResults = get().searchResults.map((user) => {
        if (user.id === targetUserId || user.friendshipId === friendshipId) {
          return {
            ...user,
            friendshipStatus: 'none' as const,
            friendshipId: undefined,
          };
        }
        return user;
      });

      const updatedFriends = get().friends.filter(
        (f) => f.id !== targetUserId && f.friendshipId !== friendshipId
      );
      const updatedPending = get().pendingRequests.filter(
        (f) => f.id !== targetUserId && f.friendshipId !== friendshipId
      );

      setLive({
        searchResults: updatedResults,
        friends: updatedFriends,
        pendingRequests: updatedPending,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de suppression';
      setLive({ error: message });
    }
  },

  fetchFriendsList: async (currentUserId) => {
    // Ignore les réponses arrivées après une déconnexion (compte suivant).
    const setLive = bindSetToSession(set);
    setLive({ isLoading: true, error: null });
    try {
      const { friends, pendingRequests } = await friendsService.getFriendsList(currentUserId);
      setLive({ friends, pendingRequests, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement de la liste d amitié';
      setLive({ isLoading: false, error: message });
    }
  },

  resetSearch: () => set({ searchResults: [], searchQuery: '', isSearching: false, error: null }),
}));

// Données propres au compte connecté : remises à zéro à la déconnexion.
registerUserScopedStore(useFriendsStore);
