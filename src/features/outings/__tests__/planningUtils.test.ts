import { PlannedOutingRow } from '@/shared/types';
import { OutingActivity } from '../types/activities';
import { MemberAvailability, OutingMember } from '../types/scheduling';
import {
  appendActivity,
  buildDayPlanning,
  changeStepDuration,
  computeAttendance,
  computeGap,
  dateAtMinutes,
  defaultPlanningDay,
  DEFAULT_PLANNING_START,
  fromMinutes,
  moveStep,
  planningDays,
  stepDuration,
  suggestPlanning,
  suggestStartTime,
  toMinutes,
  unplacedActivitiesOf,
} from '../utils/planningUtils';

const DAY = '2026-11-14';
const OTHER_DAY = '2026-11-15';

const member = (userId: string, status: OutingMember['status'] = 'accepted'): OutingMember => ({
  userId,
  displayName: userId,
  avatarUrl: null,
  status,
  isOrganizer: userId === 'alice',
});

const MEMBERS = [member('alice'), member('bob'), member('charlie'), member('dan', 'invited')];

const slot = (userId: string, start: string, end: string, day = DAY): MemberAvailability => ({
  userId,
  day,
  start,
  end,
});

const AVAILABILITIES = [
  slot('alice', '14:00', '23:30'),
  slot('bob', '14:00', '22:00'),
  slot('charlie', '20:00', '23:30'),
];

const step = (
  id: string,
  time: string,
  durationMin: number | null,
  overrides: Partial<PlannedOutingRow> = {},
): PlannedOutingRow => ({
  id,
  outing_id: 'o1',
  activity_id: null,
  place_id: null,
  title: id,
  description: null,
  notes: null,
  scheduled_for: dateAtMinutes(DAY, toMinutes(time)),
  duration_min: durationMin,
  status: 'pending',
  created_by: 'alice',
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

const activity = (id: string, overrides: Partial<OutingActivity> = {}): OutingActivity => ({
  id,
  outingId: 'o1',
  day: DAY,
  title: id,
  note: null,
  proposedBy: 'alice',
  place: null,
  chosen: true,
  createdAt: 't',
  ...overrides,
});

describe('planningUtils — time helpers', () => {
  it('converts between HH:mm and minutes, wrapping after midnight', () => {
    expect(toMinutes('20:30')).toBe(1230);
    expect(fromMinutes(1230)).toBe('20:30');
    expect(fromMinutes(24 * 60 + 15)).toBe('00:15');
  });

  it('builds local timestamps, past midnight included', () => {
    const late = new Date(dateAtMinutes(DAY, 24 * 60 + 30));
    expect(late.getDate()).toBe(15);
    expect(late.getHours()).toBe(0);
    expect(late.getMinutes()).toBe(30);
  });

  it('gives a default duration to a step without one', () => {
    expect(stepDuration(step('s', '14:00', null))).toBe(60);
    expect(stepDuration(step('s', '14:00', 90))).toBe(90);
  });
});

describe('planningUtils — days', () => {
  it('lists candidate days and days that have a step, sorted', () => {
    const steps = [step('s', '14:00', 60, { scheduled_for: dateAtMinutes('2026-11-01', 600) })];
    expect(planningDays([OTHER_DAY, DAY], steps)).toEqual(['2026-11-01', DAY, OTHER_DAY]);
  });

  it('opens the outing date when it is a planning day, else the first day', () => {
    expect(defaultPlanningDay([DAY, OTHER_DAY], dateAtMinutes(OTHER_DAY, 600))).toBe(OTHER_DAY);
    expect(defaultPlanningDay([DAY, OTHER_DAY], null)).toBe(DAY);
    expect(defaultPlanningDay([], null)).toBeNull();
  });
});

describe('planningUtils — attendance', () => {
  const alice = member('alice');

  it.each([
    ['14:00', '23:00', 'present', null, null],
    ['20:00', '23:00', 'arrivesLate', '20:00', null],
    ['14:00', '19:30', 'leavesEarly', null, '19:30'],
    ['19:30', '20:00', 'partial', '19:30', '20:00'],
    ['21:00', '23:00', 'absent', null, null],
  ])('slot %s–%s during a 19:00–21:00 step → %s', (start, end, kind, arrival, departure) => {
    expect(computeAttendance(alice, 19 * 60, 21 * 60, slot('alice', start, end))).toEqual({
      member: alice,
      kind,
      arrival,
      departure,
    });
  });

  it('a member without a slot that day is absent', () => {
    expect(computeAttendance(alice, 600, 660, undefined).kind).toBe('absent');
  });
});

describe('planningUtils — gaps and start', () => {
  it('computes travel time and overlaps between two steps', () => {
    expect(computeGap(900, 915)).toEqual({ kind: 'travel', minutes: 15 });
    expect(computeGap(900, 870)).toEqual({ kind: 'overlap', minutes: 30 });
    expect(computeGap(900, 900)).toEqual({ kind: 'none' });
  });

  it('starts when the majority is available, so a late arrival does not delay everyone', () => {
    expect(suggestStartTime(DAY, AVAILABILITIES, MEMBERS)).toBe('14:00');
  });

  it('waits for the group when only one person is available early', () => {
    const slots = [slot('alice', '10:00', '23:00'), slot('bob', '18:00', '23:00'), slot('charlie', '18:00', '22:00')];
    expect(suggestStartTime(DAY, slots, MEMBERS)).toBe('18:00');
  });

  it('ignores members who do not attend and falls back without slots', () => {
    expect(suggestStartTime(DAY, [slot('dan', '09:00', '10:00')], MEMBERS)).toBe(DEFAULT_PLANNING_START);
    expect(suggestStartTime(OTHER_DAY, AVAILABILITIES, MEMBERS)).toBe(DEFAULT_PLANNING_START);
  });
});

describe('planningUtils — day planning', () => {
  const steps = [
    step('karting', '14:00', 90, { activity_id: 'a-karting' }),
    step('resto', '20:00', 150),
    step('cancelled', '16:00', 60, { status: 'cancelled' }),
    step('other-day', '14:00', 60, { scheduled_for: dateAtMinutes(OTHER_DAY, 840) }),
  ];
  const activities = [
    activity('a-karting'),
    activity('a-any', { day: null }),
    activity('a-other-day', { day: OTHER_DAY }),
    activity('a-not-chosen', { chosen: false }),
  ];
  const planning = buildDayPlanning(DAY, steps, activities, AVAILABILITIES, MEMBERS);

  it('orders the day steps, skips cancelled ones and other days', () => {
    expect(planning.steps.map((v) => v.step.id)).toEqual(['karting', 'resto']);
    expect(planning.steps[0]).toMatchObject({ start: '14:00', end: '15:30', durationMin: 90 });
  });

  it('computes the attendance and warns about the late arrival', () => {
    const [karting, resto] = planning.steps;
    expect(karting.attendance.map((a) => a.kind)).toEqual(['present', 'present', 'absent']);
    expect(karting.warnings.map((w) => w.member.userId)).toEqual(['charlie']);
    expect(resto.attendance.map((a) => a.kind)).toEqual(['present', 'leavesEarly', 'present']);
    expect(resto.gapBefore).toEqual({ kind: 'travel', minutes: 270 });
  });

  it('lists retained activities of the day or of any day that are not placed', () => {
    expect(planning.unplacedActivities.map((a) => a.id)).toEqual(['a-any']);
    expect(unplacedActivitiesOf(OTHER_DAY, activities, steps).map((a) => a.id)).toEqual([
      'a-any',
      'a-other-day',
    ]);
  });

  it('a cancelled step frees its activity, which can be placed again', () => {
    const cancelled = [step('old', '14:00', 60, { activity_id: 'a-any', status: 'cancelled' })];
    expect(unplacedActivitiesOf(DAY, activities, cancelled).map((a) => a.id)).toContain('a-any');
  });

  it('keeps every packed step on the planned day, even late in the evening', () => {
    const late = buildDayPlanning(
      DAY,
      [step('a', '21:00', 120), step('b', '23:00', 180)],
      [],
      AVAILABILITIES,
      MEMBERS,
    );
    const changes = moveStep(late, 'b', 'up', 30);
    expect(changes?.reschedule[1].scheduledFor).toBe(dateAtMinutes(DAY, 23 * 60 + 59));
  });

  it('suggests: keeps the order, appends the activities, packs from the suggested start', () => {
    const changes = suggestPlanning(planning, 15);
    expect(changes.reschedule).toEqual([
      { id: 'karting', scheduledFor: dateAtMinutes(DAY, 840), durationMin: 90 },
      { id: 'resto', scheduledFor: dateAtMinutes(DAY, 945), durationMin: 150 },
    ]);
    expect(changes.placements).toEqual([
      { activityId: 'a-any', scheduledFor: dateAtMinutes(DAY, 1110), durationMin: 60 },
    ]);
  });

  it('moves a step and re-packs the day from its first start', () => {
    const changes = moveStep(planning, 'resto', 'up', 0);
    expect(changes?.reschedule).toEqual([
      { id: 'resto', scheduledFor: dateAtMinutes(DAY, 840), durationMin: 150 },
      { id: 'karting', scheduledFor: dateAtMinutes(DAY, 990), durationMin: 90 },
    ]);
    expect(moveStep(planning, 'karting', 'up', 0)).toBeNull();
    expect(moveStep(planning, 'resto', 'down', 0)).toBeNull();
  });

  it('changes a duration and shifts the following steps', () => {
    const changes = changeStepDuration(planning, 'karting', 120, 30);
    expect(changes.reschedule[1]).toEqual({
      id: 'resto',
      scheduledFor: dateAtMinutes(DAY, 840 + 120 + 30),
      durationMin: 150,
    });
  });

  it('places an activity after the last step, or at the suggested start of an empty day', () => {
    expect(appendActivity(planning, 'a-any', 15)).toEqual({
      activityId: 'a-any',
      scheduledFor: dateAtMinutes(DAY, 20 * 60 + 150 + 15),
      durationMin: 60,
    });
    const empty = buildDayPlanning(DAY, [], activities, AVAILABILITIES, MEMBERS);
    expect(appendActivity(empty, 'a-any', 15).scheduledFor).toBe(dateAtMinutes(DAY, 840));
  });
});
