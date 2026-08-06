import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PendingFriendRequestsBanner } from '../components/PendingFriendRequestsBanner';
import { UserSearchResult } from '../types';

describe('PendingFriendRequestsBanner', () => {
  const mockRequests: UserSearchResult[] = [
    {
      id: 'user-1',
      email: 'alex@crazer.app',
      fullName: 'Alexandre Martin',
      avatarUrl: null,
      friendshipStatus: 'pending_received',
      friendshipId: 'f-101',
    },
    {
      id: 'user-2',
      email: 'sophie@crazer.app',
      fullName: 'Sophie Bernard',
      avatarUrl: null,
      friendshipStatus: 'pending_received',
      friendshipId: 'f-102',
    },
  ];

  it('doit ne rien afficher si la liste est vide', () => {
    const { queryByTestId } = render(
      <PendingFriendRequestsBanner
        pendingRequests={[]}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );
    expect(queryByTestId('pending-friend-requests-banner')).toBeNull();
  });

  it('doit afficher les demandes d ami et déclencher l acceptation et le refus', () => {
    const onAcceptMock = jest.fn();
    const onRejectMock = jest.fn();

    const { getByText, getByTestId } = render(
      <PendingFriendRequestsBanner
        pendingRequests={mockRequests}
        onAccept={onAcceptMock}
        onReject={onRejectMock}
      />
    );

    expect(getByText(/Demandes d'ami en attente/i)).toBeTruthy();
    expect(getByText('Alexandre Martin')).toBeTruthy();

    const acceptBtn = getByTestId('btn-banner-accept-user-1');
    fireEvent.press(acceptBtn);
    expect(onAcceptMock).toHaveBeenCalledWith('f-101');

    const rejectBtn = getByTestId('btn-banner-reject-user-1');
    fireEvent.press(rejectBtn);
    expect(onRejectMock).toHaveBeenCalledWith('f-101', 'user-1');
  });

  it('doit masquer la bannière lors du clic sur le bouton Masquer', () => {
    const { getByTestId, queryByTestId } = render(
      <PendingFriendRequestsBanner
        pendingRequests={mockRequests}
        onAccept={jest.fn()}
        onReject={jest.fn()}
      />
    );

    expect(getByTestId('pending-friend-requests-banner')).toBeTruthy();

    const hideBtn = getByTestId('btn-hide-friend-banner');
    fireEvent.press(hideBtn);

    expect(queryByTestId('pending-friend-requests-banner')).toBeNull();
  });
});
