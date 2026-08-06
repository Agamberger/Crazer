import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { UserSearchInput } from '../components/UserSearchInput';
import { UserListItem } from '../components/UserListItem';
import { UserSearchModal } from '../components/UserSearchModal';
import { UserProfileDetailModal } from '../components/UserProfileDetailModal';
import { useFriendsStore } from '../store/useFriendsStore';
import { friendsService } from '../services/friendsService';

jest.mock('../services/friendsService');
jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'current-user-id', email: 'me@crazer.app', fullName: 'Current User' },
    isAuthenticated: true,
  }),
}));

describe('Composants UI - Recherche d utilisateurs et Amis', () => {
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

  describe('UserSearchInput', () => {
    it('doit afficher la valeur et déclencher onChangeText et onClear', () => {
      const onChangeTextMock = jest.fn();
      const onClearMock = jest.fn();

      const { getByTestId } = render(
        <UserSearchInput
          value="Alexandre"
          onChangeText={onChangeTextMock}
          onClear={onClearMock}
        />
      );

      const input = getByTestId('input-user-search');
      expect(input.props.value).toBe('Alexandre');

      fireEvent.changeText(input, 'Alex');
      expect(onChangeTextMock).toHaveBeenCalledWith('Alex');

      const clearBtn = getByTestId('btn-clear-search');
      fireEvent.press(clearBtn);
      expect(onClearMock).toHaveBeenCalled();
    });
  });

  describe('UserListItem', () => {
    it('doit afficher les initiales, le nom et le bouton Ajouter pour un statut none', () => {
      const onAddFriendMock = jest.fn();
      const user = {
        id: 'user-2',
        email: 'sophie@crazer.app',
        fullName: 'Sophie Bernard',
        avatarUrl: null,
        friendshipStatus: 'none' as const,
      };

      const { getByText, getByTestId } = render(
        <UserListItem user={user} onAddFriend={onAddFriendMock} />
      );

      expect(getByText('Sophie Bernard')).toBeTruthy();
      expect(getByText('sophie@crazer.app')).toBeTruthy();
      expect(getByText('SB')).toBeTruthy();

      const btn = getByTestId('btn-friend-status-user-2');
      expect(getByText('Ajouter')).toBeTruthy();

      fireEvent.press(btn);
      expect(onAddFriendMock).toHaveBeenCalledWith('user-2');
    });

    it('doit déclencher onPressSelect lors du clic sur la zone profil d un utilisateur', () => {
      const onPressSelectMock = jest.fn();
      const user = {
        id: 'user-2',
        email: 'sophie@crazer.app',
        fullName: 'Sophie Bernard',
        avatarUrl: null,
        friendshipStatus: 'none' as const,
      };

      const { getByTestId } = render(
        <UserListItem user={user} onPressSelect={onPressSelectMock} />
      );

      fireEvent.press(getByTestId('user-profile-touchable-user-2'));
      expect(onPressSelectMock).toHaveBeenCalledWith(user);
    });

    it('doit afficher Ami ✓ lorsque le statut est accepted', () => {
      const user = {
        id: 'user-2',
        email: 'sophie@crazer.app',
        fullName: 'Sophie Bernard',
        avatarUrl: null,
        friendshipStatus: 'accepted' as const,
        friendshipId: 'f-123',
      };

      const { getByText } = render(<UserListItem user={user} />);
      expect(getByText('Ami ✓')).toBeTruthy();
    });
  });

  describe('UserProfileDetailModal', () => {
    it('doit afficher les détails du profil utilisateur et permettre l ajout d ami', () => {
      const onAddFriendMock = jest.fn();
      const onCloseMock = jest.fn();
      const user = {
        id: 'user-50',
        email: 'claire@crazer.app',
        fullName: 'Claire Petit',
        avatarUrl: null,
        friendshipStatus: 'none' as const,
      };

      const { getByText, getByTestId } = render(
        <UserProfileDetailModal
          user={user}
          visible={true}
          onClose={onCloseMock}
          onAddFriend={onAddFriendMock}
        />
      );

      expect(getByText('Claire Petit')).toBeTruthy();
      expect(getByText('claire@crazer.app')).toBeTruthy();
      expect(getByText('+ Ajouter en ami')).toBeTruthy();

      fireEvent.press(getByTestId('btn-detail-add-friend'));
      expect(onAddFriendMock).toHaveBeenCalledWith('user-50');

      fireEvent.press(getByTestId('btn-close-profile-detail'));
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('UserSearchModal', () => {
    it('doit afficher la modal et permettre de chercher un utilisateur et d ouvrir son profil', async () => {
      const mockResults = [
        {
          id: 'user-10',
          email: 'luc@crazer.app',
          fullName: 'Luc Thomas',
          avatarUrl: null,
          friendshipStatus: 'none' as const,
        },
      ];
      (friendsService.searchUsers as jest.Mock).mockResolvedValue(mockResults);

      const onCloseMock = jest.fn();

      const { getByTestId, getByText } = render(
        <UserSearchModal visible={true} onClose={onCloseMock} />
      );

      expect(getByText('Rechercher des amis')).toBeTruthy();

      const input = getByTestId('input-user-search');
      fireEvent.changeText(input, 'Luc');

      await waitFor(() => {
        expect(friendsService.searchUsers).toHaveBeenCalledWith('Luc', 'current-user-id');
        expect(getByText('Luc Thomas')).toBeTruthy();
      });

      // Cliquer sur le profil de Luc
      fireEvent.press(getByTestId('user-profile-touchable-user-10'));

      await waitFor(() => {
        expect(getByText("Profil de l'utilisateur")).toBeTruthy();
      });
    });
  });
});
