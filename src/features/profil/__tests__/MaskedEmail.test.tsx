import React from 'react';
import { render } from '@testing-library/react-native';
import { UserListItem } from '../components/UserListItem';
import { UserProfileDetailModal } from '../components/UserProfileDetailModal';
import { UserSearchResult } from '../types';

const maskedUser: UserSearchResult = {
  id: 'user-3',
  email: null,
  fullName: 'Charlie Moreau',
  avatarUrl: null,
  friendshipStatus: 'none',
};

describe('Profils avec email masqué par le serveur', () => {
  it('UserListItem affiche le nom sans planter quand email est null', () => {
    const { getByText, queryByText } = render(<UserListItem user={maskedUser} />);

    expect(getByText('Charlie Moreau')).toBeTruthy();
    expect(queryByText('@')).toBeNull();
  });

  it('UserListItem retombe sur un libellé générique sans nom ni email', () => {
    const { getByText } = render(<UserListItem user={{ ...maskedUser, fullName: null }} />);

    expect(getByText('Utilisateur')).toBeTruthy();
  });

  it("UserProfileDetailModal n'affiche pas de ligne email vide", () => {
    const { getAllByText, queryByText } = render(
      <UserProfileDetailModal visible user={maskedUser} onClose={jest.fn()} />,
    );

    expect(getAllByText('Charlie Moreau').length).toBeGreaterThan(0);
    expect(queryByText('null')).toBeNull();
  });
});
