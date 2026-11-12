import { supabase } from '@/shared/lib/supabase';
import { outingPlanningService } from '../services/outingPlanningService';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: { rpc: jest.fn(), channel: jest.fn(), removeChannel: jest.fn() },
}));

const rpc = supabase.rpc as jest.Mock;
const channel = supabase.channel as jest.Mock;
const removeChannel = supabase.removeChannel as jest.Mock;

describe('outingPlanningService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('applyPlanning sends the reschedules and placements as snake_case JSON in one RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await outingPlanningService.applyPlanning('o1', {
      reschedule: [{ id: 's1', scheduledFor: '2026-11-14T13:00:00.000Z', durationMin: 60 }],
      placements: [{ activityId: 'a1', scheduledFor: '2026-11-14T14:15:00.000Z', durationMin: 90 }],
    });
    expect(rpc).toHaveBeenCalledWith('apply_outing_planning', {
      p_outing_id: 'o1',
      p_steps: [{ id: 's1', scheduled_for: '2026-11-14T13:00:00.000Z', duration_min: 60 }],
      p_placements: [{ activity_id: 'a1', scheduled_for: '2026-11-14T14:15:00.000Z', duration_min: 90 }],
    });
  });

  it('setMyAvailability calls the RPC with the slot of the day', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await outingPlanningService.setMyAvailability('o1', '2026-11-14', { start: '20:00', end: '23:00' });
    expect(rpc).toHaveBeenCalledWith('set_my_outing_availability', {
      p_outing_id: 'o1',
      p_day: '2026-11-14',
      p_start: '20:00',
      p_end: '23:00',
    });
  });

  it('throws the RPC error messages', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'only the organizer' } });
    await expect(
      outingPlanningService.applyPlanning('o1', { reschedule: [], placements: [] }),
    ).rejects.toThrow('only the organizer');
    await expect(
      outingPlanningService.setMyAvailability('o1', 'd', { start: '1', end: '2' }),
    ).rejects.toThrow('only the organizer');
  });

  it('subscribeToPlanning listens to the outing steps and activities and cleans up', () => {
    const subscribed = { on: jest.fn(), subscribe: jest.fn() };
    subscribed.on.mockReturnValue(subscribed);
    subscribed.subscribe.mockReturnValue(subscribed);
    channel.mockReturnValue(subscribed);
    const onChange = jest.fn();

    const unsubscribe = outingPlanningService.subscribeToPlanning('o1', onChange);

    ['planned_outings', 'outing_activities'].forEach((table) =>
      expect(subscribed.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: 'outing_id=eq.o1' },
        onChange,
      ),
    );
    expect(subscribed.on).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(subscribed);
  });
});
