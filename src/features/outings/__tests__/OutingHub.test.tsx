import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useFriendsStore } from '@/features/profil';
import { OutingRow } from '@/shared/types';
import { OutingHub } from '../components/hub/OutingHub';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingAnswersStore } from '../store/useOutingAnswersStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { OutingMember } from '../types/scheduling';

jest.setTimeout(20000);

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

let mockUserId = 'alice';
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
    inviteToOuting: jest.fn(),
    respondToInvitation: jest.fn(),
    subscribeToOutingScheduling: jest.fn(() => jest.fn()),
  },
}));

const service = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const OUTING: OutingRow = {
  id: 'o1',
  title: 'Glouglou',
  description: null,
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: 'one_day',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const member = (userId: string, status: OutingMember['status']): OutingMember => ({
  userId,
  displayName: userId.toUpperCase(),
  avatarUrl: null,
  status,
  isOrganizer: userId === 'alice',
});

const updateOuting = jest.fn();
const fetchAnswers = jest.fn();
const fetchActivities = jest.fn();
const fetchFriendsList = jest.fn();
const onClose = jest.fn();

const onOpenPlanning = jest.fn();

const renderHub = () =>
  render(<OutingHub outingId="o1" onClose={onClose} onOpenPlanning={onOpenPlanning} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'alice';
  useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
  useOutingsStore.setState({
    outings: [OUTING],
    updateOuting,
    fetchOutingById: jest.fn(),
    fetchPlannedOutings: jest.fn(),
  });
  useOutingAnswersStore.setState({ answersByOutingId: {}, fetchAnswers });
  useActivityVotesStore.setState({ activitiesByOutingId: {}, fetchActivities });
  useFriendsStore.setState({
    friends: [
      { id: 'bob', email: null, fullName: 'Bob', avatarUrl: null, friendshipStatus: 'accepted' },
      { id: 'dave', email: null, fullName: 'Dave', avatarUrl: null, friendshipStatus: 'accepted' },
    ],
    isLoading: false,
    fetchFriendsList,
  });
  service.fetchOutingDays.mockResolvedValue(['2026-11-14', '2026-11-15']);
  service.fetchAvailabilities.mockResolvedValue([
    { userId: 'alice', day: '2026-11-14', start: '18:00', end: '23:00' },
  ]);
  service.fetchMembers.mockResolvedValue([member('alice', 'accepted'), member('bob', 'invited')]);
});

describe('OutingHub', () => {
  it('affiche le nom et le résumé des trois sections', async () => {
    const { getByTestId, getByText, getByLabelText } = renderHub();

    expect(getByTestId('hub-title-input').props.value).toBe('Glouglou');
    await waitFor(() => expect(getByTestId('hub-when-days')).toBeTruthy());
    expect(getByText('1 jour avec un créneau commun')).toBeTruthy();
    expect(getByLabelText('1 participant · 1 en attente')).toBeTruthy();
    expect(getByTestId('hub-what-type')).toHaveTextContent('☀️ Une journée');
    expect(getByTestId('hub-what-answers')).toHaveTextContent('0/1 ont répondu aux questions');
    expect(getByTestId('hub-what-activities')).toHaveTextContent('Aucune activité dans la pool');
    expect(fetchAnswers).toHaveBeenCalledWith('o1');
    expect(fetchActivities).toHaveBeenCalledWith('o1');
  });

  it('montre la date choisie à la place des jours', async () => {
    useOutingsStore.setState({ outings: [{ ...OUTING, start_date: '2026-11-14T17:00:00.000Z' }] });
    const { findByTestId } = renderHub();
    expect(await findByTestId('hub-when-date')).toBeTruthy();
  });

  it('se ferme depuis l’en-tête', () => {
    const { getByTestId } = renderHub();
    fireEvent.press(getByTestId('btn-hub-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('Quand ? ouvre le panneau des jours et des dispos', async () => {
    const { getByTestId, findByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-when'));
    expect(await findByTestId('when-calendar')).toBeTruthy();
    expect(getByTestId('my-slot-2026-11-14-start')).toBeTruthy();
  });

  it('renomme la sortie quand le champ perd le focus', async () => {
    updateOuting.mockResolvedValue({ ...OUTING, title: 'Bowling' });
    const { getByTestId } = renderHub();
    fireEvent.changeText(getByTestId('hub-title-input'), ' Bowling ');
    await act(async () => {
      fireEvent(getByTestId('hub-title-input'), 'blur');
    });
    expect(updateOuting).toHaveBeenCalledWith('o1', { title: 'Bowling' });
  });

  it('remet l’ancien nom si le renommage échoue ou si le nom est vide', async () => {
    updateOuting.mockResolvedValue(null);
    const { getByTestId } = renderHub();
    fireEvent.changeText(getByTestId('hub-title-input'), '   ');
    await act(async () => {
      fireEvent(getByTestId('hub-title-input'), 'blur');
    });
    expect(updateOuting).not.toHaveBeenCalled();
    expect(getByTestId('hub-title-input').props.value).toBe('Glouglou');
  });

  it('un membre voit le nom sans pouvoir le modifier', () => {
    mockUserId = 'bob';
    const { getByTestId, queryByTestId } = renderHub();
    expect(getByTestId('hub-title')).toHaveTextContent('Glouglou');
    expect(queryByTestId('hub-title-input')).toBeNull();
  });

  it('Qui ? : l’organisateur voit les membres et invite un ami qui n’est pas encore invité', async () => {
    service.inviteToOuting.mockResolvedValue(1);
    const { getByTestId, queryByTestId, findByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());

    fireEvent.press(getByTestId('hub-row-who'));
    expect(await findByTestId('member-bob')).toBeTruthy();
    expect(queryByTestId('checkbox-friend-bob')).toBeNull();

    fireEvent.press(getByTestId('checkbox-friend-dave'));
    await act(async () => {
      fireEvent.press(getByTestId('btn-hub-invite'));
    });

    expect(service.inviteToOuting).toHaveBeenCalledWith('o1', ['dave']);
    expect(getByTestId('hub-invite-feedback')).toHaveTextContent(/Invitation envoyée à 1 ami\./);
  });

  it('Qui ? : un échec d’invitation est affiché dans le panneau', async () => {
    service.inviteToOuting.mockRejectedValue(new Error('only the organizer can invite'));
    const { getByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-who'));
    fireEvent.press(getByTestId('checkbox-friend-dave'));
    await act(async () => {
      fireEvent.press(getByTestId('btn-hub-invite'));
    });
    expect(getByTestId('hub-invite-feedback')).toHaveTextContent(
      /Impossible d’envoyer les invitations/,
    );
  });

  it('Qui ? : un membre ne peut pas inviter', async () => {
    mockUserId = 'bob';
    const { getByTestId, queryByText } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-who'));
    expect(queryByText('Inviter des amis')).toBeNull();
  });

  it('Qui ? : l’organisateur n’a pas de réponse à donner', async () => {
    const { getByTestId, queryByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-who'));
    expect(queryByTestId('my-answer-accepted')).toBeNull();
  });

  it('Qui ? : un invité en attente accepte depuis le panneau', async () => {
    mockUserId = 'bob';
    service.respondToInvitation.mockResolvedValue();
    const { getByTestId, findByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-who'));
    expect(await findByTestId('my-answer-pending')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('my-answer-accepted'));
    });

    expect(service.respondToInvitation).toHaveBeenCalledWith('o1', 'accepted', []);
    expect(getByTestId('my-answer-feedback')).toHaveTextContent(/Super, tu viens/);
  });

  it('Qui ? : un membre passe à « peut-être » en gardant ses dispos', async () => {
    mockUserId = 'bob';
    service.fetchMembers.mockResolvedValue([
      member('alice', 'accepted'),
      member('bob', 'accepted'),
    ]);
    service.fetchAvailabilities.mockResolvedValue([
      { userId: 'bob', day: '2026-11-14', start: '19:00', end: '22:00' },
    ]);
    service.respondToInvitation.mockResolvedValue();
    const { getByTestId, queryByTestId } = renderHub();
    await waitFor(() => expect(service.fetchAvailabilities).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-who'));
    expect(queryByTestId('my-answer-pending')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('my-answer-maybe'));
    });

    expect(service.respondToInvitation).toHaveBeenCalledWith('o1', 'maybe', [
      { day: '2026-11-14', start: '19:00', end: '22:00' },
    ]);
  });

  it('Qui ? : un échec de réponse est affiché dans le panneau', async () => {
    mockUserId = 'bob';
    service.respondToInvitation.mockRejectedValue(new Error('boom'));
    const { getByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    fireEvent.press(getByTestId('hub-row-who'));
    await act(async () => {
      fireEvent.press(getByTestId('my-answer-declined'));
    });
    expect(getByTestId('my-answer-feedback')).toHaveTextContent(
      /Impossible d’enregistrer ta réponse/,
    );
  });

  it('garde la sortie sélectionnée tant que le hub est ouvert et se désabonne à la fermeture', async () => {
    const unsubscribe = jest.fn();
    service.subscribeToOutingScheduling.mockReturnValue(unsubscribe);
    const { unmount } = renderHub();
    await waitFor(() => expect(service.subscribeToOutingScheduling).toHaveBeenCalled());
    expect(useOutingsStore.getState().selectedOutingId).toBe('o1');

    unmount();
    expect(useOutingsStore.getState().selectedOutingId).toBeNull();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('ne laisse pas la sélection d’un autre hub à la fermeture', async () => {
    const { unmount } = renderHub();
    await waitFor(() => expect(useOutingsStore.getState().selectedOutingId).toBe('o1'));
    act(() => useOutingsStore.getState().selectOuting('o2'));
    unmount();
    expect(useOutingsStore.getState().selectedOutingId).toBe('o2');
  });

  it('ne charge les amis qu’à l’ouverture de « Qui ? » par l’organisateur', async () => {
    const { getByTestId } = renderHub();
    await waitFor(() => expect(service.fetchMembers).toHaveBeenCalled());
    expect(fetchFriendsList).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('hub-row-who'));
    expect(fetchFriendsList).toHaveBeenCalledWith('alice');
  });

  it('Entrée puis perte du focus ne renomment qu’une fois', async () => {
    updateOuting.mockResolvedValue({ ...OUTING, title: 'Bowling' });
    const { getByTestId } = renderHub();
    fireEvent.changeText(getByTestId('hub-title-input'), 'Bowling');
    await act(async () => {
      fireEvent(getByTestId('hub-title-input'), 'submitEditing');
      fireEvent(getByTestId('hub-title-input'), 'blur');
    });
    expect(updateOuting).toHaveBeenCalledTimes(1);
  });

  it('affiche un chargement tant que la sortie n’est pas connue', () => {
    useOutingsStore.setState({ outings: [] });
    const { getByText } = renderHub();
    expect(getByText('Chargement de la sortie...')).toBeTruthy();
  });
});
