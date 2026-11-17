import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';
import { WhatActivitiesSection } from '../components/hub/what/WhatActivitiesSection';
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
jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
  },
}));

const service = activityVotesService as jest.Mocked<typeof activityVotesService>;
const scheduling = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const DAY = '2026-11-10';
const OUTING: OutingRow = {
  id: 'o1',
  title: 'Glouglou',
  description: null,
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: 'precise',
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const member = (
  userId: string,
  displayName: string,
  status: OutingMember['status'],
): OutingMember => ({
  userId,
  displayName,
  avatarUrl: null,
  status,
  isOrganizer: userId === 'alice',
});

const activity = (
  id: string,
  title: string,
  overrides: Partial<OutingActivity> = {},
): OutingActivity => ({
  id,
  outingId: 'o1',
  title,
  note: null,
  proposedBy: 'alice',
  place: null,
  createdAt: `2026-11-01T10:00:0${id.length}Z`,
  ...overrides,
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

const callbacks = {
  onClose: jest.fn(),
  onSearchOnMap: jest.fn(),
  onPlace: jest.fn(),
};

const renderVotes = () =>
  render(
    <WhatActivitiesSection
      outingId="o1"
      userId={mockUserId}
      onSearchOnMap={callbacks.onSearchOnMap}
      onPlace={callbacks.onPlace}
    />,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'alice';
  activities = [activity('a', 'Bowling'), activity('bb', 'Cinéma')];
  votes = [];
  useToastStore.getState().clear();
  useActivityVotesStore.setState(useActivityVotesStore.getInitialState(), true);
  useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
  useOutingsStore.setState({ outings: [OUTING], plannedOutings: [], fetchOutingById: jest.fn() });
  setup();
});

describe('WhatActivitiesSection', () => {
  it('affiche la pool, meilleur score d’abord, avec le score en direct', async () => {
    votes = [{ activityId: 'bb', userId: 'bob', vote: 'accepted' }];
    const { findByTestId, getByTestId, getAllByTestId } = renderVotes();
    await findByTestId('activity-bb');
    expect(getByTestId('activity-score-bb').props.children.join('')).toContain('2 pts');
    expect(getByTestId('activity-voters-bb')).toBeTruthy();
    expect(getAllByTestId(/^activity-(a|bb)$/).map((node) => node.props.testID)).toEqual([
      'activity-bb',
      'activity-a',
    ]);
  });

  it('une activité placée dans le programme quitte la pool', async () => {
    useOutingsStore.setState({
      plannedOutings: [
        {
          id: 's1',
          outing_id: 'o1',
          activity_id: 'a',
          place_id: null,
          title: 'Bowling',
          description: null,
          notes: null,
          scheduled_for: '2026-11-10T17:00:00.000Z',
          duration_min: 60,
          status: 'pending',
          created_by: 'alice',
          created_at: 't',
          updated_at: 't',
        },
      ],
    });
    const { findByTestId, queryByTestId } = renderVotes();
    await findByTestId('activity-bb');
    expect(queryByTestId('activity-a')).toBeNull();
  });

  it('un vote « Partant » est envoyé puis recharge les résultats', async () => {
    service.castVote.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-vote-accepted-a'));
    await waitFor(() =>
      expect(service.castVote).toHaveBeenCalledWith('o1', 'a', 'alice', 'accepted'),
    );
    expect(service.fetchActivities.mock.calls.length).toBeGreaterThan(1);
  });

  it('toucher à nouveau son vote le retire', async () => {
    votes = [{ activityId: 'a', userId: 'alice', vote: 'accepted' }];
    service.removeVote.mockResolvedValue();
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-vote-accepted-a'));
    await waitFor(() => expect(service.removeVote).toHaveBeenCalledWith('a', 'alice'));
  });

  it('« + Activité perso » ajoute une activité à la pool et vide le formulaire', async () => {
    service.proposeActivity.mockResolvedValue(activity('c', 'Resto'));
    const { findByTestId, getByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-custom-activity'));
    fireEvent.changeText(await findByTestId('input-activity-title'), ' Resto ');
    fireEvent.press(getByTestId('btn-propose-activity'));
    await waitFor(() =>
      expect(service.proposeActivity).toHaveBeenCalledWith(
        expect.objectContaining({ outingId: 'o1', userId: 'alice', title: ' Resto ' }),
      ),
    );
    await waitFor(() => expect(getByTestId('input-activity-title').props.value).toBe(''));
  });

  it('« → Programme » envoie l’activité au programme', async () => {
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-place-a'));
    expect(callbacks.onPlace).toHaveBeenCalledWith('a');
  });

  it('« Chercher sur la carte » ouvre la carte', async () => {
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-activity-on-map'));
    expect(callbacks.onSearchOnMap).toHaveBeenCalled();
  });

  it('affiche le lieu d’une activité', async () => {
    activities = [
      activity('a', 'Bowling', {
        place: { id: 'p1', name: 'Strike', address: '1 rue X', rating: 4 },
      }),
    ];
    const { findByTestId } = renderVotes();
    const label = await findByTestId('activity-place-a');
    expect(JSON.stringify(label.props.children)).toContain('Strike');
  });

  it('refuse un titre vide', async () => {
    const { findByTestId } = renderVotes();
    fireEvent.press(await findByTestId('btn-custom-activity'));
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

  it('un invité qui n’a pas rejoint ne peut ni voter ni proposer', async () => {
    mockUserId = 'charlie';
    const { findByTestId, queryByTestId } = renderVotes();
    await findByTestId('activities-cannot-vote');
    expect(queryByTestId('btn-vote-accepted-a')).toBeNull();
    expect(queryByTestId('propose-activity-form')).toBeNull();
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
    expect(await findByTestId('what-activities-load-failed')).toBeTruthy();
  });
});
