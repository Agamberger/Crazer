import { PlannedOutingRow } from '@/shared/types';
import { buildStartDate, DEFAULT_TIME_RANGE, toDayKey } from '../utils/availabilityUtils';
import { defaultProgrammeStart, placementAt, sortProgrammeSteps } from '../utils/programmeUtils';

const DAY = '2099-06-10';
const NEXT_DAY = '2099-06-11';

const step = (
  id: string,
  day: string,
  time: string,
  durationMin: number,
  overrides: Partial<PlannedOutingRow> = {},
): PlannedOutingRow => ({
  id,
  outing_id: 'o1',
  activity_id: null,
  place_id: null,
  title: id,
  description: null,
  notes: null,
  scheduled_for: buildStartDate(day, time),
  duration_min: durationMin,
  status: 'pending',
  created_by: 'alice',
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

const STEPS = sortProgrammeSteps([
  step('resto', DAY, '20:00', 90),
  step('karting', DAY, '14:00', 90),
  step('brunch', NEXT_DAY, '11:00', 60),
]);

describe('sortProgrammeSteps', () => {
  it('orders the steps chronologically', () => {
    expect(STEPS.map((s) => s.id)).toEqual(['karting', 'resto', 'brunch']);
  });
});

describe('placementAt', () => {
  it('after a step: starts when it ends', () => {
    expect(placementAt(STEPS, 1, 'unused')).toEqual({
      scheduledFor: buildStartDate(DAY, '15:30'),
      durationMin: 60,
    });
  });

  it('before the first step: takes its time', () => {
    expect(placementAt(STEPS, 0, 'unused')).toEqual({
      scheduledFor: buildStartDate(DAY, '14:00'),
      durationMin: 60,
    });
  });

  it('at the end: after the last step', () => {
    expect(placementAt(STEPS, 3, 'unused')).toEqual({
      scheduledFor: buildStartDate(NEXT_DAY, '12:00'),
      durationMin: 60,
    });
  });

  it('ignores a cancelled step above the drop point', () => {
    const steps = sortProgrammeSteps([
      step('karting', DAY, '14:00', 90),
      step('bowling', DAY, '16:00', 60, { status: 'cancelled' }),
    ]);
    expect(placementAt(steps, 2, 'unused').scheduledFor).toBe(buildStartDate(DAY, '15:30'));
  });

  it('ignores a cancelled first step when dropped first', () => {
    const steps = sortProgrammeSteps([
      step('bowling', DAY, '12:00', 60, { status: 'cancelled' }),
      step('karting', DAY, '14:00', 90),
    ]);
    expect(placementAt(steps, 0, 'unused').scheduledFor).toBe(buildStartDate(DAY, '14:00'));
  });

  it('empty programme: uses the given start', () => {
    const start = buildStartDate(DAY, '18:00');
    expect(placementAt([], 0, start)).toEqual({ scheduledFor: start, durationMin: 60 });
  });
});

describe('defaultProgrammeStart', () => {
  const now = new Date(2099, 5, 1, 9, 0);

  it('uses the outing date first', () => {
    const date = '2099-06-12T16:00:00.000Z';
    expect(defaultProgrammeStart({ start_date: date }, [DAY], now)).toBe(date);
  });

  it('else the first candidate day at the default evening start', () => {
    expect(defaultProgrammeStart({ start_date: null }, [NEXT_DAY, DAY], now)).toBe(
      buildStartDate(DAY, DEFAULT_TIME_RANGE.start),
    );
  });

  it('else today at the default evening start', () => {
    expect(defaultProgrammeStart({ start_date: null }, [], now)).toBe(
      buildStartDate(toDayKey(now), DEFAULT_TIME_RANGE.start),
    );
  });
});
