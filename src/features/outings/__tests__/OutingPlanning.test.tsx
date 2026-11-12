import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useToastStore } from '@/shared/store/useToastStore';
import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { OutingPlanning } from '../components/planning/OutingPlanning';
import { activityVotesService } from '../services/activityVotesService';
import { outingPlanningService } from '../services/outingPlanningService';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { outingService } from '../services/outingService';
import { useActivityVotesStore } from '../store/useActivityVotesStore';
import { useOutingPlanningStore } from '../store/useOutingPlanningStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';
import { OutingActivity } from '../types/activities';
import { MemberAvailability, OutingMember } from '../types/scheduling';
import { dateAtMinutes } from '../utils/planningUtils';

jest.setTimeout(20000);

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));

let mockUserId = 'alice';
jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: mockUserId } }),
}));

jest.mock('../services/outingPlanningService', () => ({
  outingPlanningService: {
    applyPlanning: jest.fn(),
    setMyAvailability: jest.fn(),
    subscribeToPlanning: jest.fn(),
  },
}));
jest.mock('../services/outingService', () => ({
  outingService: { fetchPlannedOutings: jest.fn(), getOutingById: jest.fn() },
}));
jest.mock('../services/activityVotesService', () => ({
  activityVotesService: {
    fetchActivities: jest.fn(),
    fetchVotes: jest.fn(),
  },
}));
jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: {
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
    subscribeToOutingScheduling: jest.fn(),
  },
}));

const planning = outingPlanningService as jest.Mocked<typeof outingPlanningService>;
const outings = outingService as jest.Mocked<typeof outingService>;
const votes = activityVotesService as jest.Mocked<typeof activityVotesService>;
const scheduling = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const DAY = '2026-11-14';
const OUTING: OutingRow = {
  id: 'o1', title: 'Samedi entre potes', description: null,
  start_date: dateAtMinutes(DAY, 14 * 60), created_by: 'alice', status: 'planned',
  cover_image: null, outing_type: 'one_day', created_at: 't', updated_at: 't',
};

const member = (userId: string, displayName: string): OutingMember => ({
  userId, displayName, avatarUrl: null, status: 'accepted', isOrganizer: userId === 'alice',
});

const slot = (userId: string, start: string, end: string): MemberAvailability => ({
  userId, day: DAY, start, end,
});

const step = (id: string, minutes: number, durationMin: number, title: string): PlannedOutingRow => ({
  id, outing_id: 'o1', activity_id: id === 'karting' ? 'a-karting' : null, place_id: null, title,
  description: null, notes: null, scheduled_for: dateAtMinutes(DAY, minutes), duration_min: durationMin,
  status: 'pending', created_by: 'alice', created_at: 't', updated_at: 't',
});

const activity = (id: string, title: string, day: string | null): OutingActivity => ({
  id, outingId: 'o1', day, title, note: null, proposedBy: 'alice', place: null, chosen: true,
  createdAt: 't',
});

let availabilities: MemberAvailability[];
let steps: PlannedOutingRow[];

const renderPlanning = () => render(<OutingPlanning outingId="o1" onClose={jest.fn()} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'alice';
  availabilities = [slot('alice', '14:00', '23:30'), slot('bob', '14:00', '22:00'), slot('charlie', '20:00', '23:30')];
  steps = [step('karting', 14 * 60, 90, 'Karting'), step('glace', 16 * 60, 30, 'Glace')];
  useToastStore.getState().clear();
  useActivityVotesStore.setState(useActivityVotesStore.getInitialState(), true);
  useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
  useOutingPlanningStore.setState(useOutingPlanningStore.getInitialState(), true);
  useOutingsStore.setState({ outings: [OUTING], selectedOutingId: null, fetchOutingById: jest.fn() });

  outings.fetchPlannedOutings.mockImplementation(async () => steps);
  votes.fetchActivities.mockResolvedValue([
    activity('a-karting', 'Karting', DAY),
    activity('a-resto', 'Restaurant', null),
  ]);
  planning.subscribeToPlanning.mockReturnValue(jest.fn());
  scheduling.subscribeToOutingScheduling.mockReturnValue(jest.fn());
  scheduling.fetchOutingDays.mockResolvedValue([DAY]);
  scheduling.fetchAvailabilities.mockImplementation(async () => availabilities);
  scheduling.fetchMembers.mockResolvedValue([
    member('alice', 'Alice'),
    member('bob', 'Bob'),
    member('charlie', 'Charlie'),
  ]);
  planning.applyPlanning.mockResolvedValue();
  planning.setMyAvailability.mockResolvedValue();
});

describe('OutingPlanning', () => {
  it('shows the steps with times, travel segments, attendance and late-arrival warnings', async () => {
    steps = [step('karting', 14 * 60, 90, 'Karting'), step('resto', 19 * 60 + 30, 90, 'Resto')];
    const { findByTestId, getByTestId, getByText, getAllByText } = renderPlanning();
    await findByTestId('planning-step-karting');
    expect(getByTestId('planning-step-time-karting').props.children.join('')).toBe('14:00 – 15:30');
    expect(getByText('🚶 Trajet / attente · 4h')).toBeTruthy();
    expect(getByTestId('planning-attendance-karting-charlie')).toBeTruthy();

    expect(getByText('Hors des dispos de : Charlie · pas dispo.')).toBeTruthy();
    expect(getAllByText('⏰ Charlie · arrive à 20:00')).toHaveLength(1);
    expect(getByText('Hors des dispos de : Charlie · arrive à 20:00.')).toBeTruthy();
    expect(getByTestId('planning-suggested-start').props.children.join('')).toContain('14:00');
    expect(getByTestId('planning-unplaced-a-resto')).toBeTruthy();
  });

  it('organizer: « Proposer des horaires » packs the steps and places the retained activities', async () => {
    const { findByTestId } = renderPlanning();
    fireEvent.press(await findByTestId('btn-planning-suggest'));
    await waitFor(() =>
      expect(planning.applyPlanning).toHaveBeenCalledWith('o1', {
        reschedule: [
          { id: 'karting', scheduledFor: dateAtMinutes(DAY, 840), durationMin: 90 },
          { id: 'glace', scheduledFor: dateAtMinutes(DAY, 945), durationMin: 30 },
        ],
        placements: [
          { activityId: 'a-resto', scheduledFor: dateAtMinutes(DAY, 990), durationMin: 60 },
        ],
      }),
    );
    expect(votes.fetchVotes).not.toHaveBeenCalled();
  });

  it('organizer: the travel time option is used by the next change', async () => {
    const { findByTestId, getByTestId } = renderPlanning();
    fireEvent.press(await findByTestId('planning-travel-0'));
    fireEvent.press(getByTestId('planning-move-up-glace'));
    await waitFor(() =>
      expect(planning.applyPlanning).toHaveBeenCalledWith('o1', {
        reschedule: [
          { id: 'glace', scheduledFor: dateAtMinutes(DAY, 840), durationMin: 30 },
          { id: 'karting', scheduledFor: dateAtMinutes(DAY, 870), durationMin: 90 },
        ],
        placements: [],
      }),
    );
  });

  it('organizer: places one activity after the last step', async () => {
    const { findByTestId } = renderPlanning();
    fireEvent.press(await findByTestId('planning-place-a-resto'));
    await waitFor(() =>
      expect(planning.applyPlanning).toHaveBeenCalledWith('o1', {
        reschedule: [],
        placements: [
          {
            activityId: 'a-resto',
            scheduledFor: dateAtMinutes(DAY, 16 * 60 + 30 + 15),
            durationMin: 60,
          },
        ],
      }),
    );
  });

  it('organizer: changes a duration through the modal', async () => {
    const { findByTestId, getByTestId } = renderPlanning();
    fireEvent.press(await findByTestId('planning-duration-karting'));
    fireEvent.press(getByTestId('chip-duration-120'));
    fireEvent.press(getByTestId('btn-save-step-duration'));
    await waitFor(() =>
      expect(planning.applyPlanning).toHaveBeenCalledWith('o1', {
        reschedule: [
          { id: 'karting', scheduledFor: dateAtMinutes(DAY, 840), durationMin: 120 },
          { id: 'glace', scheduledFor: dateAtMinutes(DAY, 975), durationMin: 30 },
        ],
        placements: [],
      }),
    );
  });

  it('shows an error toast when a change fails', async () => {
    planning.applyPlanning.mockRejectedValue(new Error('refusé'));
    const { findByTestId } = renderPlanning();
    fireEvent.press(await findByTestId('btn-planning-suggest'));
    await waitFor(() =>
      expect(useToastStore.getState().queue[0]?.message).toBe('Impossible d’appliquer la suggestion.'),
    );
  });

  it('member: no organizer actions, and can give a late arrival for the day', async () => {
    mockUserId = 'charlie';
    availabilities = availabilities.filter((a) => a.userId !== 'charlie');
    const { findByTestId, queryByTestId, getByTestId } = renderPlanning();
    await findByTestId('planning-step-karting');
    expect(queryByTestId('btn-planning-suggest')).toBeNull();
    expect(queryByTestId('planning-move-up-glace')).toBeNull();
    expect(queryByTestId('planning-place-a-resto')).toBeNull();

    fireEvent.press(getByTestId('btn-save-my-slot'));
    await waitFor(() =>
      expect(planning.setMyAvailability).toHaveBeenCalledWith('o1', DAY, { start: '18:00', end: '23:00' }),
    );
  });

  it('shows an empty state when the loading fails', async () => {
    outings.fetchPlannedOutings.mockRejectedValue(new Error('réseau'));
    const { findByTestId } = renderPlanning();
    expect(await findByTestId('planning-load-failed')).toBeTruthy();
  });
});
