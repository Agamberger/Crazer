import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';
import { ActivityTieBreak } from '../components/activities/ActivityTieBreak';
import { ActivityVotes } from '../components/activities/ActivityVotes';
import { activityPlacesService } from '../services/activityPlacesService';
import { activityVotesService } from '../services/activityVotesService';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { ActivityVoteEntry, OutingActivity } from '../types/activities';
import { OutingMember } from '../types/scheduling';

jest.setTimeout(20000);

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

let mockUserId = 'alice';
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

jest.mock('../services/activityVotesService', () => ({
  activityVotesService: {
    fetchActivities: jest.fn(),
    fetchVotes: jest.fn(),
    proposeActivity: jest.fn(),
    deleteActivity: jest.fn(),
    castVote: jest.fn(),
    removeVote: jest.fn(),
    chooseActivity: jest.fn(),
    drawActivity: jest.fn(),
    reopenActivities: jest.fn(),
    subscribeToActivities: jest.fn(),
  },
}));
jest.mock('../services/activityPlacesService', () => ({
  activityPlacesService: { searchSuggestions: jest.fn(), resolveSuggestion: jest.fn() },
}));
jest.mock('@/features/carte/hooks/usePlacesSessionToken', () => {
  const session = { getToken: () => 'token', endSession: () => undefined };
  return { usePlacesSessionToken: () => session };
});
jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
  },
}));

const service = activityVotesService as jest.Mocked<typeof activityVotesService>;
const places = activityPlacesService as jest.Mocked<typeof activityPlacesService>;
const scheduling = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const DAY = '2026-11-10';
const OUTING: OutingRow = {
  id: 'o1', title: 'Glouglou', description: null, start_date: null, created_by: 'alice',
  status: 'draft', cover_image: null, outing_type: 'precise',
  created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z',
};

const member = (userId: string, displayName: string, status: OutingMember['status']): OutingMember => ({
  userId, displayName, avatarUrl: null, status, isOrganizer: userId === 'alice',
});

const activity = (id: string, title: string, overrides: Partial<OutingActivity> = {}): OutingActivity => ({
  id, outingId: 'o1', day: DAY, title, note: null, proposedBy: 'alice', place: null, chosen: false,
  createdAt: `2026-11-01T10:00:0${id.length}Z`, ...overrides,
});

let activities: OutingActivity[];
let votes: ActivityVoteEntry[];

const setup = () => {
  service.fetchActivities.mockImplementation(async () => activities);
  service.fetchVotes.mockImplementation(async () => votes);
  service.subscribeToActivities.mockReturnValue(jest.fn());
  scheduling.fetchOutingDays.mockResolvedValue([DAY]);
  scheduling.fetchAvailabilities.mockResolvedValue([]);
  scheduling.fetchMembers.mockResolvedValue([
    member('alice', 'Alice', 'accepted'),
    member('bob', 'Bob', 'accepted'),
    member('charlie', 'Charlie', 'invited'),
  ]);
};

const callbacks = { onOpenTie: jest.fn(), onConvert: jest.fn(), onClose: jest.fn() };

const renderVotes = () => render(<ActivityVotes outingId="o1" {...callbacks} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'alice';
  activities = [activity('a', 'Bowling'), activity('bb', 'Cinéma')];
  votes = [];
  useToastStore.getState().clear();
  useActivityVotesStore.setState(useActivityVotesStore.getInitialState(), true);
  useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
  useOutingsStore.setState({ outings: [OUTING], fetchOutingById: jest.fn() });
  setup();
});

describe('ActivityVotes', () => {
  it('affiche les propositions du jour avec leur score en direct', async () => {
    votes = [{ activityId: 'a', userId: 'bob', vote: 'accepted' }];
    const { findByTestId, getByTestId } = renderVotes();
    await findByTestId('activity-a');
    expect(getByTestId('activity-score-a').props.children.join('')).toContain('2 pts');
    expect(getByTestId('activity-voters-a')).toBeTruthy();
    expect(getByTestId('activity-group-2026-11-10')).toBeTruthy();
  });

  it('un vote « Partant » est envoyé puis recharge les résultats', async () => {
    service.castVote.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-vote-accepted-a'));
    await waitFor(() => expect(service.castVote).toHaveBeenCalledWith('o1', 'a', 'alice', 'accepted'));
    expect(service.fetchActivities.mock.calls.length).toBeGreaterThan(1);
  });

  it('toucher à nouveau son vote le retire', async () => {
    votes = [{ activityId: 'a', userId: 'alice', vote: 'accepted' }];
    service.removeVote.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-vote-accepted-a'));
    await waitFor(() => expect(service.removeVote).toHaveBeenCalledWith('a', 'alice'));
  });

  it('propose une activité pour un jour et vide le formulaire', async () => {
    service.proposeActivity.mockResolvedValue(activity('c', 'Resto'));
    const { findByTestId, getByTestId } = renderVotes();
    fireEvent.changeText(await findByTestId('input-activity-title'), ' Resto ');
    fireEvent.press(getByTestId(`chips-activity-day-${DAY}`));
    fireEvent.press(getByTestId('btn-propose-activity'));
    await waitFor(() =>
      expect(service.proposeActivity).toHaveBeenCalledWith(
        expect.objectContaining({ outingId: 'o1', userId: 'alice', day: DAY, title: ' Resto ' }),
      ),
    );
    await waitFor(() => expect(getByTestId('input-activity-title').props.value).toBe(''));
  });

  it('propose une activité trouvée sur Google Maps : lieu importé, titre prérempli', async () => {
    places.searchSuggestions.mockResolvedValue([
      { key: 'g1', source: 'google', name: 'Bowling Strike', subtitle: 'Paris' },
    ]);
    places.resolveSuggestion.mockResolvedValue({ id: 'place-1', name: 'Bowling Strike' });
    service.proposeActivity.mockResolvedValue(activity('c', 'Bowling Strike'));
    const { findByTestId, getByTestId } = renderVotes();
    fireEvent.changeText(await findByTestId('input-activity-place'), 'bowling');
    fireEvent.press(await findByTestId('place-suggestion-google-g1'));
    expect(await findByTestId('activity-place-chip')).toBeTruthy();
    expect(places.resolveSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'g1' }),
      'alice',
      'token',
    );
    expect(getByTestId('input-activity-title').props.value).toBe('Bowling Strike');
    fireEvent.press(getByTestId('btn-propose-activity'));
    await waitFor(() =>
      expect(service.proposeActivity).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Bowling Strike', placeId: 'place-1' }),
      ),
    );
    await waitFor(() => expect(getByTestId('input-activity-place')).toBeTruthy());
  });

  it('le lieu choisi peut être retiré', async () => {
    places.searchSuggestions.mockResolvedValue([
      { key: 'p1', source: 'crazer', name: 'Burger', subtitle: null },
    ]);
    places.resolveSuggestion.mockResolvedValue({ id: 'p1', name: 'Burger' });
    const { findByTestId, getByTestId, queryByTestId } = renderVotes();
    fireEvent.changeText(await findByTestId('input-activity-place'), 'bur');
    fireEvent.press(await findByTestId('place-suggestion-crazer-p1'));
    await findByTestId('activity-place-chip');
    fireEvent.press(getByTestId('activity-place-chip-remove'));
    await waitFor(() => expect(queryByTestId('activity-place-chip')).toBeNull());
  });

  it('affiche le lieu d’une activité', async () => {
    activities = [
      activity('a', 'Bowling', { place: { id: 'p1', name: 'Strike', address: '1 rue X', rating: 4 } }),
    ];
    const { findByTestId } = renderVotes();
    const label = await findByTestId('activity-place-a');
    expect(JSON.stringify(label.props.children)).toContain('Strike');
  });

  it('refuse un titre vide', async () => {
    const { findByTestId } = renderVotes();
    const button = await findByTestId('btn-propose-activity');
    fireEvent.press(button);
    expect(service.proposeActivity).not.toHaveBeenCalled();
  });

  it('signale l’échec d’un vote par un toast', async () => {
    service.castVote.mockRejectedValue(new Error('denied'));
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-vote-maybe-a'));
    await waitFor(() => expect(useToastStore.getState().queue.length).toBe(1));
  });

  it('égalité : l’organisateur voit « Départager » qui ouvre l’écran d’égalité', async () => {
    votes = [
      { activityId: 'a', userId: 'alice', vote: 'accepted' },
      { activityId: 'bb', userId: 'bob', vote: 'accepted' },
    ];
    const { findByTestId } = renderVotes();
    expect(await findByTestId(`activity-tie-${DAY}`)).toBeTruthy();
    fireEvent.press(await findByTestId(`btn-open-tie-${DAY}`));
    expect(callbacks.onOpenTie).toHaveBeenCalledWith(DAY);
  });

  it('l’organisateur retient une activité', async () => {
    service.chooseActivity.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-choose-bb'));
    await waitFor(() => expect(service.chooseActivity).toHaveBeenCalledWith('bb'));
  });

  it('un membre n’a pas le bouton « Retenir »', async () => {
    mockUserId = 'bob';
    const { findByTestId, queryByTestId } = renderVotes();
    await findByTestId('btn-vote-accepted-a');
    expect(queryByTestId('btn-choose-a')).toBeNull();
  });

  it('un invité qui n’a pas rejoint ne peut ni voter ni proposer', async () => {
    mockUserId = 'charlie';
    const { findByTestId, queryByTestId } = renderVotes();
    await findByTestId('activities-cannot-vote');
    expect(queryByTestId('btn-vote-accepted-a')).toBeNull();
    expect(queryByTestId('propose-activity-form')).toBeNull();
  });

  it('décidé : badge « Retenue », vote fermé et conversion des autres résultats', async () => {
    activities = [activity('a', 'Bowling', { chosen: true }), activity('bb', 'Cinéma')];
    const { findByTestId, queryByTestId } = renderVotes();
    expect(await findByTestId('activity-chosen-a')).toBeTruthy();
    expect(queryByTestId('btn-vote-accepted-a')).toBeNull();
    fireEvent.press(await findByTestId('btn-convert-bb'));
    expect(callbacks.onConvert).toHaveBeenCalledWith(
      expect.objectContaining({ activity: expect.objectContaining({ id: 'bb' }) }),
    );
    expect(queryByTestId('btn-convert-a')).toBeNull();
  });

  it('l’organisateur peut rouvrir un vote décidé', async () => {
    activities = [activity('a', 'Bowling', { chosen: true })];
    service.reopenActivities.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId(`btn-reopen-${DAY}`));
    await waitFor(() => expect(service.reopenActivities).toHaveBeenCalledWith('o1', DAY));
  });

  it('l’organisateur peut supprimer une proposition', async () => {
    service.deleteActivity.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-remove-a'));
    await waitFor(() => expect(service.deleteActivity).toHaveBeenCalledWith('a'));
  });

  it('affiche une erreur quand le chargement échoue', async () => {
    service.fetchActivities.mockRejectedValue(new Error('boom'));
    const { findByTestId } = renderVotes();
    expect(await findByTestId('activities-load-failed')).toBeTruthy();
  });
});

describe('ActivityTieBreak', () => {
  const tieVotes: ActivityVoteEntry[] = [
    { activityId: 'a', userId: 'alice', vote: 'accepted' },
    { activityId: 'bb', userId: 'bob', vote: 'accepted' },
  ];
  const renderTie = () =>
    render(<ActivityTieBreak outingId="o1" day={DAY} onConvert={callbacks.onConvert} onClose={callbacks.onClose} />);

  beforeEach(() => {
    votes = tieVotes;
  });

  it('l’organisateur retient une des activités à égalité', async () => {
    service.chooseActivity.mockResolvedValue();
    const { findByTestId } = renderTie();
    fireEvent.press(await findByTestId('btn-choose-bb'));
    await waitFor(() => expect(service.chooseActivity).toHaveBeenCalledWith('bb'));
  });

  it('un membre attend la décision de l’organisateur, sans bouton de tirage', async () => {
    mockUserId = 'bob';
    const { findByTestId, queryByTestId } = renderTie();
    expect(await findByTestId('tie-waiting')).toBeTruthy();
    expect(queryByTestId('btn-tie-draw')).toBeNull();
    expect(queryByTestId('btn-choose-a')).toBeNull();
  });

  it('le tirage au sort anime la roulette puis annonce le gagnant', async () => {
    jest.useFakeTimers();
    try {
      service.drawActivity.mockImplementation(async () => {
        activities = [activity('a', 'Bowling'), activity('bb', 'Cinéma', { chosen: true })];
        return 'bb';
      });
      const { findByTestId, getByTestId, queryByTestId } = renderTie();
      fireEvent.press(await findByTestId('btn-tie-draw'));
      expect(await findByTestId('draw-roulette')).toBeTruthy();
      expect(queryByTestId('tie-winner')).toBeNull();
      await act(async () => {
        await jest.runAllTimersAsync();
      });
      await act(async () => {
        await jest.runAllTimersAsync();
      });
      expect(service.drawActivity).toHaveBeenCalledWith('o1', DAY);
      expect(await findByTestId('tie-winner')).toBeTruthy();
      expect(getByTestId('tie-decided')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('annonce le résultat décidé par l’organisateur aux membres', async () => {
    mockUserId = 'bob';
    activities = [activity('a', 'Bowling', { chosen: true }), activity('bb', 'Cinéma')];
    const { findByTestId } = renderTie();
    expect(await findByTestId('tie-winner')).toBeTruthy();
  });

  it('indique l’absence d’égalité', async () => {
    votes = [{ activityId: 'a', userId: 'alice', vote: 'accepted' }];
    const { findByTestId } = renderTie();
    expect(await findByTestId('tie-none')).toBeTruthy();
  });
});
