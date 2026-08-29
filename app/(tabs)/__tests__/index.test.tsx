import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import OutingsScreen from '../index';
import { useOutingsStore } from '@/features/outings';
import { OutingRow } from '@/shared/types';
import { useNavigation } from 'expo-router';

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
  const mockUpdateOuting = jest.fn();
  const mockFetchOutingById = jest.fn();

  const mockOuting: OutingRow = {
    id: 'out-1',
    title: 'Soirée Jeux de Société',
    description: 'A la maison',
    start_date: '2026-08-30T19:00:00Z',
    created_by: 'test-user-id',
    status: 'planned',
    cover_image: null,
    created_at: '2026-08-24T18:00:00Z',
    updated_at: '2026-08-24T18:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: null,
      isLoading: false,
      error: null,
      fetchOutings: mockFetchOutings,
      createOuting: mockCreateOuting,
      updateOuting: mockUpdateOuting,
      fetchOutingById: mockFetchOutingById,
    });
  });

  it('renders correctly and calls fetchOutings on mount', async () => {
    const { getByText } = render(<OutingsScreen />);

    expect(getByText('Organise et rejoins des sorties entre amis !')).toBeTruthy();
    expect(getByText('+ Organiser une sortie')).toBeTruthy();
    expect(mockFetchOutings).toHaveBeenCalled();
  });

  it('displays outings list and switches to edit form upon clicking an outing', () => {
    useOutingsStore.setState({
      outings: [mockOuting],
      selectedOutingId: null,
      isLoading: false,
      error: null,
    });

    const { getByText, queryByTestId } = render(<OutingsScreen />);

    expect(getByText('Soirée Jeux de Société')).toBeTruthy();
    expect(getByText('A la maison')).toBeTruthy();
    expect(queryByTestId('input-title')).toBeNull();

    // Cliquer sur la carte de la sortie
    fireEvent.press(getByText('Soirée Jeux de Société'));

    // L'état du store est mis à jour et le formulaire d'édition apparaît sur le même onglet
    expect(useOutingsStore.getState().selectedOutingId).toBe('out-1');
  });

  it('renders edit form with outing title directly editable, and allows submitting changes', async () => {
    mockUpdateOuting.mockResolvedValue({
      ...mockOuting,
      title: 'Soirée Jeux Modifiée',
    });

    useOutingsStore.setState({
      outings: [mockOuting],
      selectedOutingId: 'out-1',
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<OutingsScreen />);

    expect(getByTestId('input-title').props.value).toBe('Soirée Jeux de Société');

    // Modifier le titre directement en tête de formulaire
    fireEvent.changeText(getByTestId('input-title'), 'Soirée Jeux Modifiée');
    expect(getByTestId('input-title').props.value).toBe('Soirée Jeux Modifiée');

    fireEvent.press(getByTestId('btn-submit-outing-edit'));

    await waitFor(() => {
      expect(mockUpdateOuting).toHaveBeenCalledWith(
        'out-1',
        expect.objectContaining({
          title: 'Soirée Jeux Modifiée',
        })
      );
      // Retour à la liste (selectedOutingId reset)
      expect(useOutingsStore.getState().selectedOutingId).toBeNull();
    });
  });

  it('allows canceling edit and returns to outings list', () => {
    useOutingsStore.setState({
      outings: [mockOuting],
      selectedOutingId: 'out-1',
      isLoading: false,
      error: null,
    });

    const { getByTestId } = render(<OutingsScreen />);

    fireEvent.press(getByTestId('btn-cancel-outing-edit'));
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  });

  it('resets selectedOutingId to null on tabPress event', () => {
    let tabPressCallback: () => void = () => {};
    (useNavigation as jest.Mock).mockReturnValue({
      setOptions: jest.fn(),
      addListener: jest.fn((event, cb) => {
        if (event === 'tabPress') {
          tabPressCallback = cb;
        }
        return jest.fn();
      }),
    });

    useOutingsStore.setState({
      outings: [mockOuting],
      selectedOutingId: 'out-1',
      isLoading: false,
      error: null,
    });

    render(<OutingsScreen />);
    expect(useOutingsStore.getState().selectedOutingId).toBe('out-1');

    // Déclencher le clic sur l'onglet Sorties
    act(() => {
      tabPressCallback();
    });

    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
  });

  it('displays loading state if selected outing is being loaded', () => {
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: 'out-1',
      isLoading: true,
      error: null,
    });

    const { getByTestId } = render(<OutingsScreen />);
    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('displays not found state if selected outing does not exist', () => {
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: 'out-unknown',
      isLoading: false,
      error: null,
    });

    const { getByTestId, getByText } = render(<OutingsScreen />);
    expect(getByTestId('not-found-state')).toBeTruthy();
    expect(getByText('Sortie introuvable')).toBeTruthy();

    fireEvent.press(getByText('Retour aux sorties'));
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
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
