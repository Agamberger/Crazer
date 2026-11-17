import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import OutingsScreen from '../sorties';
import { useOutingSchedulingStore, useOutingsStore } from '@/features/outings';
import { OutingRow } from '@/shared/types';
import { useRouter } from 'expo-router';

jest.mock('@/features/profil', () => ({
  useFriends: () => ({
    pendingRequests: [],
    fetchFriendsList: jest.fn(),
    acceptFriendRequest: jest.fn(),
    removeFriendship: jest.fn(),
  }),
  PendingFriendRequestsBanner: () => null,
}));

jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

describe('OutingsScreen (Outings Tab)', () => {
  const mockFetchOutings = jest.fn();
  const mockFetchInvitations = jest.fn();

  const mockOuting: OutingRow = {
    id: 'out-1',
    title: 'Soirée Jeux de Société',
    description: 'A la maison',
    start_date: '2026-08-30T19:00:00Z',
    created_by: 'test-user-id',
    status: 'planned',
    cover_image: null,
    outing_type: null,
    created_at: '2026-08-24T18:00:00Z',
    updated_at: '2026-08-24T18:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      outings: [],
      isLoading: false,
      error: null,
      fetchOutings: mockFetchOutings,
    });
    useOutingSchedulingStore.setState({
      invitations: [],
      nonAttendingOutingIds: [],
      fetchInvitations: mockFetchInvitations,
    });
  });

  it('renders correctly and calls fetchOutings on mount', () => {
    const { getByText } = render(<OutingsScreen />);

    expect(getByText('Organise et rejoins des sorties entre amis !')).toBeTruthy();
    expect(getByText('+ Organiser une sortie')).toBeTruthy();
    expect(mockFetchOutings).toHaveBeenCalled();
  });

  it('lists my outings and opens the hub of the pressed outing', () => {
    useOutingsStore.setState({ outings: [mockOuting] });
    const { getByText } = render(<OutingsScreen />);

    expect(getByText('A la maison')).toBeTruthy();
    fireEvent.press(getByText('Soirée Jeux de Société'));

    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/outing/[id]',
      params: { id: 'out-1' },
    });
  });

  it('hides the outings I do not attend', () => {
    useOutingsStore.setState({ outings: [mockOuting] });
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: ['out-1'] });
    const { queryByText } = render(<OutingsScreen />);

    expect(queryByText('Soirée Jeux de Société')).toBeNull();
  });

  it('opens the creation screen when "+ Organiser une sortie" is pressed', () => {
    const { getByText } = render(<OutingsScreen />);

    fireEvent.press(getByText('+ Organiser une sortie'));

    expect(useRouter().push).toHaveBeenCalledWith('/outing/create');
  });

  it('lists pending invitations and opens the join flow', () => {
    useOutingSchedulingStore.setState({
      invitations: [{ outing: mockOuting, organizerName: 'Macéo', invitedAt: mockOuting.created_at }],
    });
    const { getByTestId } = render(<OutingsScreen />);

    expect(mockFetchInvitations).toHaveBeenCalledWith('test-user-id');
    fireEvent.press(getByTestId('invitation-out-1'));

    expect(useRouter().push).toHaveBeenCalledWith({
      pathname: '/outing/[id]/join',
      params: { id: 'out-1' },
    });
  });
});
