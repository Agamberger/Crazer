import { OutingRow } from '@/shared/types';
import { outingSchedulingService } from '../services/outingSchedulingService';
import { outingService } from '../services/outingService';
import { resolveStepBaseDate } from '../services/stepBaseDate';
import { buildStartDate, DEFAULT_TIME_RANGE } from '../utils/availabilityUtils';

jest.mock('@/shared/lib/supabase', () => ({ supabase: {} }));
jest.mock('../services/outingService', () => ({
  outingService: { fetchPlannedOutings: jest.fn() },
}));
jest.mock('../services/outingSchedulingService', () => ({
  outingSchedulingService: { fetchOutingDays: jest.fn() },
}));

const steps = outingService.fetchPlannedOutings as jest.Mock;
const days = outingSchedulingService.fetchOutingDays as jest.Mock;

const outing: OutingRow = {
  id: 'o1',
  title: 'Sortie',
  description: null,
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('resolveStepBaseDate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the outing date when it has one', async () => {
    const date = await resolveStepBaseDate({ ...outing, start_date: '2026-11-10T18:00:00.000Z' });
    expect(date.toISOString()).toBe('2026-11-10T18:00:00.000Z');
    expect(steps).not.toHaveBeenCalled();
  });

  it('uses the first planned step of an undated outing', async () => {
    steps.mockResolvedValue([{ scheduled_for: '2026-11-12T19:00:00.000Z' }]);
    const date = await resolveStepBaseDate(outing);
    expect(date.toISOString()).toBe('2026-11-12T19:00:00.000Z');
    expect(days).not.toHaveBeenCalled();
  });

  it('falls back to the first candidate day when there is no step', async () => {
    steps.mockResolvedValue([]);
    days.mockResolvedValue(['2026-11-14', '2026-11-15']);
    const date = await resolveStepBaseDate(outing);
    expect(date.toISOString()).toBe(buildStartDate('2026-11-14', DEFAULT_TIME_RANGE.start));
  });

  it('falls back to now without step nor candidate day, or when a lookup fails', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-09T10:00:00.000Z'));
    try {
      steps.mockResolvedValue([]);
      days.mockResolvedValue([]);
      expect((await resolveStepBaseDate(outing)).toISOString()).toBe('2026-11-09T10:00:00.000Z');
      steps.mockRejectedValue(new Error('offline'));
      expect((await resolveStepBaseDate(outing)).toISOString()).toBe('2026-11-09T10:00:00.000Z');
    } finally {
      jest.useRealTimers();
    }
  });
});
