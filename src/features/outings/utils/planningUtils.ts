import { PlannedOutingRow } from '@/shared/types';
import { OutingActivity } from '../types/activities';
import {
  ActivityPlacement,
  AttendanceKind,
  DayPlanning,
  MoveDirection,
  PlanningChanges,
  PlanningGap,
  PlanningStepView,
  StepAttendance,
  StepSchedule,
} from '../types/planning';
import { DayKey, MemberAvailability, OutingMember } from '../types/scheduling';
import { attendingMembers, dayKeyToDate, toDayKey } from './availabilityUtils';

/** Duration given to a step without one (and to a newly placed activity). */
export const DEFAULT_STEP_DURATION_MIN = 60;
/** Default travel / waiting time between two activities. */
export const DEFAULT_TRAVEL_MIN = 15;
/** Start of the day when nobody gave a slot for it. */
export const DEFAULT_PLANNING_START = '18:00';

const MINUTES_PER_DAY = 24 * 60;
/** Latest start kept on the planned day: later steps would move to the next day. */
const LAST_START_MINUTE = MINUTES_PER_DAY - 1;

const pad = (n: number): string => String(n).padStart(2, '0');

/** `HH:mm` → minutes since midnight. */
export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/** Minutes since midnight → `HH:mm` (wraps after midnight). */
export const fromMinutes = (minutes: number): string => {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
};

/** Day + minutes since its midnight (may go past midnight) → ISO timestamp, local time. */
export const dateAtMinutes = (day: DayKey, minutes: number): string => {
  const date = dayKeyToDate(day);
  date.setHours(0, minutes, 0, 0);
  return date.toISOString();
};

/** Local day of a step. */
export const stepDay = (step: PlannedOutingRow): DayKey => toDayKey(new Date(step.scheduled_for));

/** Local start of a step, in minutes since midnight. */
export const stepStartMinutes = (step: PlannedOutingRow): number => {
  const date = new Date(step.scheduled_for);
  return date.getHours() * 60 + date.getMinutes();
};

/** Duration of a step, with the default when none is set. */
export const stepDuration = (step: PlannedOutingRow): number =>
  step.duration_min && step.duration_min > 0 ? step.duration_min : DEFAULT_STEP_DURATION_MIN;

/** Days shown in the planning: candidate days plus days that already have a step. */
export const planningDays = (
  candidateDays: ReadonlyArray<DayKey>,
  steps: ReadonlyArray<PlannedOutingRow>,
): DayKey[] => [...new Set([...candidateDays, ...steps.map(stepDay)])].sort();

/** Day opened first: the outing's date when it is a planning day, else the first day. */
export const defaultPlanningDay = (
  days: ReadonlyArray<DayKey>,
  startDate: string | null,
): DayKey | null => {
  const startDay = startDate ? toDayKey(new Date(startDate)) : null;
  if (startDay && days.includes(startDay)) return startDay;
  return days[0] ?? null;
};

const attendanceKindOf = (arrivesLate: boolean, leavesEarly: boolean): AttendanceKind => {
  if (arrivesLate && leavesEarly) return 'partial';
  if (arrivesLate) return 'arrivesLate';
  if (leavesEarly) return 'leavesEarly';
  return 'present';
};

/** How a member's slot `[slotStart, slotEnd]` covers the step `[start, end]` (minutes). */
export const computeAttendance = (
  member: OutingMember,
  start: number,
  end: number,
  slot: MemberAvailability | undefined,
): StepAttendance => {
  const absent: StepAttendance = { member, kind: 'absent', arrival: null, departure: null };
  if (!slot) return absent;
  const slotStart = toMinutes(slot.start);
  const slotEnd = toMinutes(slot.end);
  if (slotEnd <= start || slotStart >= end) return absent;

  const arrivesLate = slotStart > start;
  const leavesEarly = slotEnd < end;
  return {
    member,
    kind: attendanceKindOf(arrivesLate, leavesEarly),
    arrival: arrivesLate ? slot.start : null,
    departure: leavesEarly ? slot.end : null,
  };
};

/** Gap between the end of a step and the start of the next one (minutes). */
export const computeGap = (previousEnd: number, nextStart: number): PlanningGap => {
  const minutes = nextStart - previousEnd;
  if (minutes > 0) return { kind: 'travel', minutes };
  if (minutes < 0) return { kind: 'overlap', minutes: -minutes };
  return { kind: 'none' };
};

/**
 * Suggested start of the day: the earliest slot start at which more than half of
 * the attendees who gave a slot that day are available. A late arrival therefore
 * does not delay the whole group.
 */
export const suggestStartTime = (
  day: DayKey,
  availabilities: ReadonlyArray<MemberAvailability>,
  members: ReadonlyArray<OutingMember>,
): string => {
  const attendeeIds = new Set(attendingMembers(members).map((m) => m.userId));
  const slots = availabilities.filter((a) => a.day === day && attendeeIds.has(a.userId));
  if (slots.length === 0) return DEFAULT_PLANNING_START;

  const starts = [...new Set(slots.map((s) => s.start))].sort();
  const majority = starts.find((time) => {
    const available = slots.filter((s) => s.start <= time && s.end > time).length;
    return available * 2 > slots.length;
  });
  return majority ?? starts[0];
};

/** Retained activities that can go on this day and are not placed on any day yet. */
export const unplacedActivitiesOf = (
  day: DayKey,
  activities: ReadonlyArray<OutingActivity>,
  steps: ReadonlyArray<PlannedOutingRow>,
): OutingActivity[] => {
  const placedIds = new Set(
    steps
      .filter((s) => s.status !== 'cancelled')
      .map((s) => s.activity_id)
      .filter((id) => id !== null),
  );
  return activities.filter(
    (a) => a.chosen && (a.day === null || a.day === day) && !placedIds.has(a.id),
  );
};

/** Planning of one day: ordered steps with times, attendance, gaps, and what is left to place. */
export const buildDayPlanning = (
  day: DayKey,
  steps: ReadonlyArray<PlannedOutingRow>,
  activities: ReadonlyArray<OutingActivity>,
  availabilities: ReadonlyArray<MemberAvailability>,
  members: ReadonlyArray<OutingMember>,
): DayPlanning => {
  const attendees = attendingMembers(members);
  const daySlots = availabilities.filter((a) => a.day === day);
  const daySteps = steps
    .filter((s) => s.status !== 'cancelled' && stepDay(s) === day)
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());

  let previousEnd: number | null = null;
  const views = daySteps.map((step): PlanningStepView => {
    const start = stepStartMinutes(step);
    const durationMin = stepDuration(step);
    const end = start + durationMin;
    const attendance = attendees.map((member) =>
      computeAttendance(
        member,
        start,
        end,
        daySlots.find((s) => s.userId === member.userId),
      ),
    );
    const gapBefore: PlanningGap =
      previousEnd === null ? { kind: 'none' } : computeGap(previousEnd, start);
    previousEnd = end;
    return {
      step,
      start: fromMinutes(start),
      end: fromMinutes(end),
      durationMin,
      attendance,
      warnings: attendance.filter((a) => a.kind !== 'present'),
      gapBefore,
    };
  });

  return {
    day,
    steps: views,
    unplacedActivities: unplacedActivitiesOf(day, activities, steps),
    suggestedStart: suggestStartTime(day, availabilities, members),
  };
};

/** One element of an ordered schedule: an existing step or an activity to place. */
export type ScheduleItem =
  | { kind: 'step'; id: string; durationMin: number }
  | { kind: 'activity'; activityId: string; durationMin: number };

/**
 * Packs the items one after the other from `startTime`, with `travelMin` between them.
 * Starts are capped at 23:59 so every item stays on `day` (overlaps are then shown as warnings).
 */
export const buildSchedule = (
  day: DayKey,
  items: ReadonlyArray<ScheduleItem>,
  startTime: string,
  travelMin: number,
): PlanningChanges => {
  const reschedule: StepSchedule[] = [];
  const placements: ActivityPlacement[] = [];
  let cursor = toMinutes(startTime);
  items.forEach((item) => {
    const scheduledFor = dateAtMinutes(day, Math.min(cursor, LAST_START_MINUTE));
    if (item.kind === 'step') {
      reschedule.push({ id: item.id, scheduledFor, durationMin: item.durationMin });
    } else {
      placements.push({ activityId: item.activityId, scheduledFor, durationMin: item.durationMin });
    }
    cursor += item.durationMin + travelMin;
  });
  return { reschedule, placements };
};

const stepItems = (planning: DayPlanning): ScheduleItem[] =>
  planning.steps.map((view) => ({ kind: 'step', id: view.step.id, durationMin: view.durationMin }));

/** Start of the current day plan: its first step, else the suggested start. */
const currentStart = (planning: DayPlanning): string =>
  planning.steps[0]?.start ?? planning.suggestedStart;

/**
 * Suggestion: keeps the organizer's order, appends the retained activities not
 * placed yet, and packs everything from the suggested start.
 */
export const suggestPlanning = (planning: DayPlanning, travelMin: number): PlanningChanges => {
  const activityItems: ScheduleItem[] = planning.unplacedActivities.map((a) => ({
    kind: 'activity',
    activityId: a.id,
    durationMin: DEFAULT_STEP_DURATION_MIN,
  }));
  return buildSchedule(
    planning.day,
    [...stepItems(planning), ...activityItems],
    planning.suggestedStart,
    travelMin,
  );
};

/** Moves a step up or down and re-packs the day from its current start. `null` when it cannot move. */
export const moveStep = (
  planning: DayPlanning,
  stepId: string,
  direction: MoveDirection,
  travelMin: number,
): PlanningChanges | null => {
  const items = stepItems(planning);
  const index = items.findIndex((item) => item.kind === 'step' && item.id === stepId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return null;
  [items[index], items[target]] = [items[target], items[index]];
  return buildSchedule(planning.day, items, currentStart(planning), travelMin);
};

/** Changes a step's duration and re-packs the day from its current start. */
export const changeStepDuration = (
  planning: DayPlanning,
  stepId: string,
  durationMin: number,
  travelMin: number,
): PlanningChanges =>
  buildSchedule(
    planning.day,
    stepItems(planning).map((item) =>
      item.kind === 'step' && item.id === stepId ? { ...item, durationMin } : item,
    ),
    currentStart(planning),
    travelMin,
  );

/** Places one activity after the last step (or at the suggested start of an empty day). */
export const appendActivity = (
  planning: DayPlanning,
  activityId: string,
  travelMin: number,
): ActivityPlacement => {
  const last = planning.steps[planning.steps.length - 1];
  const start = last
    ? Math.min(toMinutes(last.start) + last.durationMin + travelMin, LAST_START_MINUTE)
    : toMinutes(planning.suggestedStart);
  return {
    activityId,
    scheduledFor: dateAtMinutes(planning.day, start),
    durationMin: DEFAULT_STEP_DURATION_MIN,
  };
};
