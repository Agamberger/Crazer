import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import HomeScreen from '../index';
import { useOutingSchedulingStore, useOutingsStore } from '@/features/outings';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';

const mockPendingRequests: { id: string }[] = [];

jest.mock('@/features/profil', () => ({
  useFriends: () => ({
    pendingRequests: mockPendingRequests,
    fetchFriendsList: jest.fn(),
  }),
}));

jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'alice@crazer.app', fullName: 'Alice Dupont' },
  }),
}));

const inDays = (days: number): string => new Date(Date.now() + days * 86_400_000).toISOString();

const makeOuting = (overrides: Partial<OutingRow>): OutingRow => ({
  id: 'o',
  title: 'Sortie',
  description: null,
  start_date: inDays(3),
  created_by: 'user-1',
  status: 'planned',
  cover_image: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('HomeScreen (Accueil)', () => {
  const router = useRouter();
  const mockFetchOutings = jest.fn();
  const mockCreateOuting = jest.fn();
  const mockFetchInvitations = jest.fn();
  const mockFetchScheduling = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchOutings.mockReset();
    mockCreateOuting.mockReset();
    mockPendingRequests.length = 0;
    useToastStore.getState().clear();
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: null,
      selectedPlannedOutingId: 'po-stale',
      fetchOutings: mockFetchOutings,
      createOuting: mockCreateOuting,
    });
    useOutingSchedulingStore.setState({
      invitations: [],
      nonAttendingOutingIds: [],
      schedulingByOutingId: {},
      fetchInvitations: mockFetchInvitations,
      fetchScheduling: mockFetchScheduling,
    });
  });

  test("salue l'utilisateur par son prénom et charge les sorties", () => {
    const { getByText } = render(<HomeScreen />);

    expect(getByText(/, Alice 👋$/)).toBeTruthy();
    expect(mockFetchOutings).toHaveBeenCalled();
  });

  test('met en avant la prochaine sortie et ouvre son détail dans Sorties', () => {
    useOutingsStore.setState({
      outings: [
        makeOuting({ id: 'later', title: 'Ciné', start_date: inDays(10) }),
        makeOuting({ id: 'next', title: 'Bowling', start_date: inDays(1) }),
        makeOuting({ id: 'done', title: 'Terminée', status: 'done', start_date: inDays(0.5) }),
      ],
    });
    const { getByTestId, getByText, queryByText } = render(<HomeScreen />);

    expect(getByText('Bowling')).toBeTruthy();
    // The other upcoming outing moves to « À venir », the finished one is not listed.
    expect(within(getByTestId('home-upcoming-outings')).getByText('Ciné')).toBeTruthy();
    expect(queryByText('Terminée')).toBeNull();

    fireEvent.press(getByTestId('home-next-outing-card'));

    expect(useOutingsStore.getState().selectedOutingId).toBe('next');
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  test('« Voir tout » ouvre la liste des sorties sans sélection', () => {
    useOutingsStore.setState({ outings: [makeOuting({ id: 'next' })], selectedOutingId: 'old' });
    const { getByText } = render(<HomeScreen />);

    fireEvent.press(getByText('Voir tout'));

    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  test("l'état vide ouvre l'assistant de création de sortie", () => {
    const { getByTestId } = render(<HomeScreen />);

    const emptyState = getByTestId('home-next-outing-empty');
    fireEvent.press(within(emptyState).getByText('Organiser une sortie'));

    expect(router.push).toHaveBeenCalledWith('/outing/create');
    expect(mockCreateOuting).not.toHaveBeenCalled();
  });

  test("le raccourci « Organiser une sortie » ouvre l'assistant sans créer de sortie", () => {
    const { getByTestId } = render(<HomeScreen />);

    fireEvent.press(getByTestId('home-action-create-outing'));

    expect(router.push).toHaveBeenCalledWith('/outing/create');
    expect(mockCreateOuting).not.toHaveBeenCalled();
  });

  test('charge les invitations et ouvre le parcours « Rejoindre »', () => {
    useOutingSchedulingStore.setState({
      invitations: [
        {
          outing: makeOuting({ id: 'invited-outing', title: 'Glouglou', status: 'draft' }),
          organizerName: 'Macéo',
          invitedAt: '2026-11-01T10:00:00Z',
        },
      ],
    });
    const { getByTestId, getByText } = render(<HomeScreen />);

    expect(mockFetchInvitations).toHaveBeenCalledWith('user-1');
    expect(getByText('✉️ Invité par Macéo')).toBeTruthy();

    fireEvent.press(getByTestId('invitation-invited-outing'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/outing/[id]/join',
      params: { id: 'invited-outing' },
    });
  });

  test('liste les prochaines sorties dans « À venir » et ouvre celle choisie', () => {
    useOutingsStore.setState({
      outings: [
        makeOuting({ id: 'next', title: 'Bowling', start_date: inDays(1) }),
        makeOuting({ id: 'later', title: 'Ciné', start_date: inDays(10) }),
      ],
    });
    const { getByTestId } = render(<HomeScreen />);

    fireEvent.press(getByTestId('home-upcoming-later'));

    expect(useOutingsStore.getState().selectedOutingId).toBe('later');
    expect(router.push).toHaveBeenCalledWith('/(tabs)/sorties');
  });

  test('« + Sortie » ouvre l’assistant de création', () => {
    useOutingsStore.setState({
      outings: [
        makeOuting({ id: 'next', start_date: inDays(1) }),
        makeOuting({ id: 'later', start_date: inDays(10) }),
      ],
    });
    const { getByText } = render(<HomeScreen />);

    fireEvent.press(getByText('+ Sortie'));

    expect(router.push).toHaveBeenCalledWith('/outing/create');
  });

  test('affiche les participants du prochain RDV et charge ses membres', () => {
    useOutingsStore.setState({ outings: [makeOuting({ id: 'next', title: 'Bowling' })] });
    useOutingSchedulingStore.setState({
      schedulingByOutingId: {
        next: {
          days: [],
          availabilities: [],
          members: [
            { userId: 'user-1', displayName: 'Alice', avatarUrl: null, status: 'accepted', isOrganizer: true },
            { userId: 'bob', displayName: 'Bob', avatarUrl: null, status: 'accepted', isOrganizer: false },
            { userId: 'lili', displayName: 'Lili', avatarUrl: null, status: 'invited', isOrganizer: false },
          ],
        },
      },
    });
    const { getByTestId, getByText } = render(<HomeScreen />);

    expect(mockFetchScheduling).toHaveBeenCalledWith({ id: 'next', created_by: 'user-1' });
    expect(getByTestId('home-next-outing-participants')).toBeTruthy();
    expect(getByText('2 participants · 1 en attente')).toBeTruthy();
  });

  test('masque les sorties dont on est seulement invité ou qu’on a refusées', () => {
    useOutingsStore.setState({
      outings: [
        makeOuting({ id: 'invited', title: 'Glouglou', start_date: inDays(1) }),
        makeOuting({ id: 'declined', title: 'Refusée', start_date: inDays(2) }),
        makeOuting({ id: 'mine', title: 'Bowling', start_date: inDays(3) }),
      ],
    });
    useOutingSchedulingStore.setState({ nonAttendingOutingIds: ['invited', 'declined'] });
    const { getByText, queryByText } = render(<HomeScreen />);

    expect(getByText('Bowling')).toBeTruthy();
    expect(queryByText('Glouglou')).toBeNull();
    expect(queryByText('Refusée')).toBeNull();
  });

  test('les raccourcis mènent à la carte et au profil, avec le nombre de demandes en attente', () => {
    mockPendingRequests.push({ id: 'r1' }, { id: 'r2' });
    const { getByTestId, getByText } = render(<HomeScreen />);

    expect(getByText("2 demandes d'ami en attente")).toBeTruthy();

    fireEvent.press(getByTestId('home-action-explore-map'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/carte');

    fireEvent.press(getByTestId('home-action-friends'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/profil');
  });
});
