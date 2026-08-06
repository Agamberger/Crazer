import { useFriendsStore } from '../store/useFriendsStore';
import { friendsService } from '../services/friendsService';

jest.mock('../services/friendsService');

describe('useFriendsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFriendsStore.setState({
      searchResults: [],
      friends: [],
      pendingRequests: [],
      searchQuery: '',
      isSearching: false,
      isLoading: false,
      error: null,
    });
  });

  it('doit mettre à jour la requête et réinitialiser les résultats si la requête est vide', async () => {
    useFriendsStore.getState().setSearchQuery('test');
    expect(useFriendsStore.getState().searchQuery).toBe('test');

    await useFriendsStore.getState().searchUsers('   ', 'user-1');

    expect(useFriendsStore.getState().searchResults).toEqual([]);
    expect(useFriendsStore.getState().isSearching).toBe(false);
  });

  it('doit effectuer la recherche avec succès et mettre à jour le store', async () => {
    const mockUsers = [
      {
        id: 'user-2',
        email: 'test2@crazer.app',
        fullName: 'User Two',
        avatarUrl: null,
        friendshipStatus: 'none' as const,
      },
    ];

    (friendsService.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

    await useFriendsStore.getState().searchUsers('User', 'user-1');

    expect(friendsService.searchUsers).toHaveBeenCalledWith('User', 'user-1');
    expect(useFriendsStore.getState().searchResults).toEqual(mockUsers);
    expect(useFriendsStore.getState().isSearching).toBe(false);
  });

  it('doit envoyer une demande d ami et mettre à jour le statut réactif', async () => {
    useFriendsStore.setState({
      searchResults: [
        {
          id: 'user-2',
          email: 'test2@crazer.app',
          fullName: 'User Two',
          avatarUrl: null,
          friendshipStatus: 'none',
        },
      ],
    });

    (friendsService.sendFriendRequest as jest.Mock).mockResolvedValue('f-123');

    await useFriendsStore.getState().sendFriendRequest('user-1', 'user-2');

    expect(friendsService.sendFriendRequest).toHaveBeenCalledWith('user-1', 'user-2');
    expect(useFriendsStore.getState().searchResults[0]).toEqual({
      id: 'user-2',
      email: 'test2@crazer.app',
      fullName: 'User Two',
      avatarUrl: null,
      friendshipStatus: 'pending_sent',
      friendshipId: 'f-123',
    });
  });

  it('doit réinitialiser la recherche lors de l appel à resetSearch', () => {
    useFriendsStore.setState({
      searchQuery: 'test',
      searchResults: [
        {
          id: 'user-2',
          email: 'test2@crazer.app',
          fullName: 'User Two',
          avatarUrl: null,
          friendshipStatus: 'none',
        },
      ],
      isSearching: true,
      error: 'Erreur',
    });

    useFriendsStore.getState().resetSearch();

    expect(useFriendsStore.getState().searchQuery).toBe('');
    expect(useFriendsStore.getState().searchResults).toEqual([]);
    expect(useFriendsStore.getState().isSearching).toBe(false);
    expect(useFriendsStore.getState().error).toBeNull();
  });
});
