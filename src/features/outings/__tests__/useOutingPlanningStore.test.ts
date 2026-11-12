import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { activityVotesService } from '../services/activityVotesService';
import { outingPlanningService } from '../services/outingPlanningService';
import { outingService } from '../services/outingService';
import { useOutingPlanningStore } from '../store/useOutingPlanningStore';
import { useOutingSchedulingStore } from '../store/useOutingSchedulingStore';
import { useOutingsStore } from '../store/useOutingsStore';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('../services/outingPlanningService', () => ({
  outingPlanningService: {
    applyPlanning: jest.fn(),
    setMyAvailability: jest.fn(),
    subscribeToPlanning: jest.fn(),
  },
}));
jest.mock('../services/activityVotesService', () => ({
  activityVotesService: { fetchActivities: jest.fn() },
}));
jest.mock('../services/outingService', () => ({
  outingService: { fetchPlannedOutings: jest.fn(), getOutingById: jest.fn() },
}));

const planning = outingPlanningService as jest.Mocked<typeof outingPlanningService>;
const outings = outingService as jest.Mocked<typeof outingService>;
const votes = activityVotesService as jest.Mocked<typeof activityVotesService>;

const OUTING: OutingRow = {
  id: 'o1', title: 'Samedi', description: null, start_date: null, created_by: 'alice',
  status: 'planned', cover_image: null, outing_type: 'one_day',
  created_at: 't', updated_at: 't',
};

const STEP: PlannedOutingRow = {
  id: 's1', outing_id: 'o1', activity_id: null, place_id: null, title: 'Karting',
  description: null, notes: null, scheduled_for: '2026-11-14T13:00:00.000Z', duration_min: 90,
  status: 'pending', created_by: 'alice', created_at: 't', updated_at: 't',
};

const CHANGES = {
  reschedule: [{ id: 's1', scheduledFor: '2026-11-14T12:00:00.000Z', durationMin: 90 }],
  placements: [{ activityId: 'a1', scheduledFor: '2026-11-14T14:00:00.000Z', durationMin: 60 }],
};

describe('useOutingPlanningStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutingPlanningStore.setState({ stepsByOutingId: {}, activitiesByOutingId: {}, isLoading: false, isSaving: false, error: null });
    useOutingsStore.setState({ outings: [OUTING], selectedOutingId: null });
    outings.fetchPlannedOutings.mockResolvedValue([STEP]);
    outings.getOutingById.mockResolvedValue(OUTING);
  });

  it('fetchSteps stores the steps of the outing', async () => {
    await expect(useOutingPlanningStore.getState().fetchSteps('o1')).resolves.toEqual([STEP]);
    expect(useOutingPlanningStore.getState().stepsByOutingId.o1).toEqual([STEP]);
  });

  it('fetchSteps keeps the error and returns null on failure', async () => {
    outings.fetchPlannedOutings.mockRejectedValueOnce(new Error('réseau'));
    await expect(useOutingPlanningStore.getState().fetchSteps('o1')).resolves.toBeNull();
    expect(useOutingPlanningStore.getState().error).toBe('réseau');
  });

  it('fetchActivities stores the activities without loading the votes', async () => {
    const activity = {
      id: 'a1', outingId: 'o1', day: null, title: 'Resto', note: null, proposedBy: 'bob',
      place: null, chosen: true, createdAt: 't',
    };
    votes.fetchActivities.mockResolvedValue([activity]);
    await useOutingPlanningStore.getState().fetchActivities('o1');
    expect(useOutingPlanningStore.getState().activitiesByOutingId.o1).toEqual([activity]);
  });

  it('applyChanges saves everything in one call, then refreshes the steps and the outing', async () => {
    planning.applyPlanning.mockResolvedValue();
    const fetchPlanned = jest.spyOn(useOutingsStore.getState(), 'fetchPlannedOutings');
    useOutingsStore.setState({ selectedOutingId: 'o1' });

    await useOutingPlanningStore.getState().applyChanges('o1', CHANGES);

    expect(planning.applyPlanning).toHaveBeenCalledWith('o1', CHANGES);
    expect(outings.getOutingById).toHaveBeenCalledWith('o1');
    expect(fetchPlanned).toHaveBeenCalledWith('o1');
    expect(useOutingPlanningStore.getState().isSaving).toBe(false);
  });

  it('applyChanges keeps the error and rethrows failures', async () => {
    planning.applyPlanning.mockRejectedValue(new Error('already placed'));
    await expect(useOutingPlanningStore.getState().applyChanges('o1', CHANGES)).rejects.toThrow(
      'already placed',
    );
    expect(useOutingPlanningStore.getState().error).toBe('already placed');
    expect(useOutingPlanningStore.getState().isSaving).toBe(false);
  });

  it('setMyAvailability saves the slot and refreshes the scheduling', async () => {
    planning.setMyAvailability.mockResolvedValue();
    const fetchScheduling = jest
      .spyOn(useOutingSchedulingStore.getState(), 'fetchScheduling')
      .mockResolvedValue(null);

    await useOutingPlanningStore
      .getState()
      .setMyAvailability('o1', '2026-11-14', { start: '20:00', end: '23:00' });

    expect(planning.setMyAvailability).toHaveBeenCalledWith('o1', '2026-11-14', {
      start: '20:00',
      end: '23:00',
    });
    expect(fetchScheduling).toHaveBeenCalledWith(OUTING);
  });

  it('setMyAvailability rethrows failures', async () => {
    planning.setMyAvailability.mockRejectedValue(new Error('not a candidate day'));
    await expect(
      useOutingPlanningStore.getState().setMyAvailability('o1', 'x', { start: '1', end: '2' }),
    ).rejects.toThrow('not a candidate day');
    expect(useOutingPlanningStore.getState().isSaving).toBe(false);
  });
});
