import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import OutingsScreen from '../index';
import { useOutingsStore } from '@/features/outings';

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
  const mockCreateOuting = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      outings: [],
      isLoading: false,
      error: null,
      fetchOutings: mockFetchOutings,
      createOuting: mockCreateOuting,
    });
  });

  it('renders correctly and calls fetchOutings on mount', async () => {
    const { getByText } = render(<OutingsScreen />);

    expect(getByText('Organise et rejoins des sorties entre amis !')).toBeTruthy();
    expect(getByText('+ Organiser une sortie')).toBeTruthy();
    expect(mockFetchOutings).toHaveBeenCalled();
  });

  it('displays outings when available in store', () => {
    useOutingsStore.setState({
      outings: [
        {
          id: 'out-1',
          title: 'Soirée Jeux de Société',
          description: 'A la maison',
          start_date: '2026-08-30T19:00:00Z',
          created_by: 'test-user-id',
          status: 'planned',
          cover_image: null,
          created_at: '2026-08-24T18:00:00Z',
          updated_at: '2026-08-24T18:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    const { getByText } = render(<OutingsScreen />);

    expect(getByText('Soirée Jeux de Société')).toBeTruthy();
    expect(getByText('A la maison')).toBeTruthy();
  });

  it('triggers createOuting when "+ Organiser une sortie" is pressed', async () => {
    const { getByText } = render(<OutingsScreen />);

    const button = getByText('+ Organiser une sortie');
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockCreateOuting).toHaveBeenCalledWith('test-user-id');
    });
  });
});
