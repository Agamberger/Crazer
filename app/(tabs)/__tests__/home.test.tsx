import React from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import HomeScreen from '../index';
import { useOutingsStore } from '@/features/outings';
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
    expect(queryByText('Ciné')).toBeNull();

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

  test("affiche un état vide qui permet d'organiser une sortie", async () => {
    mockCreateOuting.mockResolvedValueOnce(makeOuting({ id: 'new' }));
    const { getByTestId } = render(<HomeScreen />);

    const emptyState = getByTestId('home-next-outing-empty');
    fireEvent.press(within(emptyState).getByText('Organiser une sortie'));

    await waitFor(() => {
      expect(mockCreateOuting).toHaveBeenCalledWith('user-1');
      expect(router.push).toHaveBeenCalledWith('/(tabs)/sorties');
    });
  });

  test("affiche un toast d'erreur si la création échoue, sans quitter l'accueil", async () => {
    mockCreateOuting.mockRejectedValueOnce(new Error('network'));
    const { getByTestId } = render(<HomeScreen />);

    fireEvent.press(getByTestId('home-action-create-outing'));

    await waitFor(() => {
      expect(useToastStore.getState().queue).toContainEqual(
        expect.objectContaining({ tone: 'error' })
      );
    });
    expect(router.push).not.toHaveBeenCalled();
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
