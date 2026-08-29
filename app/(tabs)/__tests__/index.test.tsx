import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import OutingsScreen from '../index';
import { useOutingsStore } from '@/features/outings';
import { OutingRow, PlannedOutingRow } from '@/shared/types';
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
  const mockCreatePlannedOuting = jest.fn();
  const mockUpdatePlannedOuting = jest.fn();
  const mockDeletePlannedOuting = jest.fn();

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

  const mockPlannedOuting: PlannedOutingRow = {
    id: 'po-1',
    outing_id: 'out-1',
    title: 'Apéro & Cocktails',
    description: 'Verre de bienvenue',
    notes: 'Réservation au nom de Thomas',
    scheduled_for: '2026-08-30T19:00:00.000Z',
    duration_min: 60,
    status: 'confirmed',
    place_id: null,
    created_by: 'test-user-id',
    created_at: '2026-08-24T18:00:00Z',
    updated_at: '2026-08-24T18:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({
      outings: [],
      selectedOutingId: null,
      selectedPlannedOutingId: null,
      plannedOutings: [],
      isLoading: false,
      isLoadingPlannedOutings: false,
      error: null,
      fetchOutings: mockFetchOutings,
      createOuting: mockCreateOuting,
      updateOuting: mockUpdateOuting,
      fetchOutingById: mockFetchOutingById,
      createPlannedOuting: mockCreatePlannedOuting,
      updatePlannedOuting: mockUpdatePlannedOuting,
      deletePlannedOuting: mockDeletePlannedOuting,
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

    // Click on outing card
    fireEvent.press(getByText('Soirée Jeux de Société'));

    // Store state is updated with selected outing ID
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

    // Modify title directly at top of form
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
      // Returns to list (selectedOutingId reset)
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

  it('resets selectedOutingId and selectedPlannedOutingId to null on tabPress event', () => {
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
      selectedPlannedOutingId: 'po-1',
      isLoading: false,
      error: null,
    });

    render(<OutingsScreen />);
    expect(useOutingsStore.getState().selectedOutingId).toBe('out-1');
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBe('po-1');

    // Trigger tabPress event on outings tab
    act(() => {
      tabPressCallback();
    });

    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
    expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
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

  describe('Planned Outing Edit in Outings Screen', () => {
    it('switches to planned outing edit screen when a planned outing card is pressed', () => {
      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [mockPlannedOuting],
        selectedPlannedOutingId: null,
      });

      const { getByTestId } = render(<OutingsScreen />);

      // Outing edit form and planned step card are visible
      expect(getByTestId('planned-outing-card-po-1')).toBeTruthy();

      // Click on step card
      fireEvent.press(getByTestId('planned-outing-card-po-1'));

      // selectedPlannedOutingId is set to 'po-1'
      expect(useOutingsStore.getState().selectedPlannedOutingId).toBe('po-1');
    });

    it('opens planned outing creation/edit page when custom step is chosen from timeline', async () => {
      const mockCreatedStep: PlannedOutingRow = {
        id: 'po-new-custom',
        outing_id: 'out-1',
        title: 'Étape 2',
        description: null,
        notes: null,
        scheduled_for: '2026-08-30T19:00:00.000Z',
        duration_min: 60,
        status: 'pending',
        place_id: null,
        created_by: 'test-user-id',
        created_at: '2026-08-24T20:00:00Z',
        updated_at: '2026-08-24T20:00:00Z',
      };

      mockCreatePlannedOuting.mockImplementation(async () => {
        useOutingsStore.setState({
          plannedOutings: [mockPlannedOuting, mockCreatedStep],
          selectedPlannedOutingId: mockCreatedStep.id,
        });
        return mockCreatedStep;
      });

      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [mockPlannedOuting],
        selectedPlannedOutingId: null,
      });

      const { getByTestId } = render(<OutingsScreen />);

      // Open choice modal
      fireEvent.press(getByTestId('btn-add-planned-outing'));
      expect(getByTestId('modal-add-step-choice')).toBeTruthy();

      // Choose custom step
      fireEvent.press(getByTestId('btn-add-custom-step'));

      await waitFor(() => {
        expect(mockCreatePlannedOuting).toHaveBeenCalled();
        expect(useOutingsStore.getState().selectedPlannedOutingId).toBe('po-new-custom');
      });
    });

    it('renders planned outing edit form when selectedPlannedOutingId is set and allows editing & submitting', async () => {
      mockUpdatePlannedOuting.mockResolvedValue({
        ...mockPlannedOuting,
        title: 'Apéro Terrasse & Cocktails',
      });

      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [mockPlannedOuting],
        selectedPlannedOutingId: 'po-1',
      });

      const { getByTestId, getByText } = render(<OutingsScreen />);

      expect(getByTestId('planned-outing-edit-screen')).toBeTruthy();
      expect(getByText('Sortie : Soirée Jeux de Société')).toBeTruthy();
      expect(getByTestId('input-planned-title').props.value).toBe('Apéro & Cocktails');

      // Update step title
      fireEvent.changeText(getByTestId('input-planned-title'), 'Apéro Terrasse & Cocktails');

      // Save changes
      fireEvent.press(getByTestId('btn-submit-planned-edit'));

      await waitFor(() => {
        expect(mockUpdatePlannedOuting).toHaveBeenCalledWith(
          'po-1',
          expect.objectContaining({
            title: 'Apéro Terrasse & Cocktails',
          })
        );
        expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
      });
    });

    it('allows canceling planned outing edit and returns to outing view', () => {
      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [mockPlannedOuting],
        selectedPlannedOutingId: 'po-1',
      });

      const { getByTestId } = render(<OutingsScreen />);

      fireEvent.press(getByTestId('btn-cancel-planned-edit'));
      expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
    });

    it('allows deleting planned outing and returns to outing view', async () => {
      mockDeletePlannedOuting.mockResolvedValue(true);

      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [mockPlannedOuting],
        selectedPlannedOutingId: 'po-1',
      });

      const { getByTestId } = render(<OutingsScreen />);

      // Directly call delete action via deletePlannedOuting in screen
      fireEvent.press(getByTestId('btn-delete-planned-edit'));
    });

    it('displays planned loading state if planned outing is loading', () => {
      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [],
        selectedPlannedOutingId: 'po-1',
        isLoadingPlannedOutings: true,
      });

      const { getByTestId } = render(<OutingsScreen />);
      expect(getByTestId('planned-loading-state')).toBeTruthy();
    });

    it('displays not found state if planned outing does not exist', () => {
      useOutingsStore.setState({
        outings: [mockOuting],
        selectedOutingId: 'out-1',
        plannedOutings: [],
        selectedPlannedOutingId: 'po-unknown',
        isLoadingPlannedOutings: false,
      });

      const { getByTestId, getByText } = render(<OutingsScreen />);
      expect(getByTestId('planned-not-found-state')).toBeTruthy();
      expect(getByText('Étape introuvable')).toBeTruthy();

      fireEvent.press(getByText('Retour à la sortie'));
      expect(useOutingsStore.getState().selectedPlannedOutingId).toBeNull();
    });
  });
});
