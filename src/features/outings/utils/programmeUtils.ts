import { OutingRow, PlannedOutingRow } from '@/shared/types';
import { DayKey } from '../types/scheduling';
import { buildStartDate, DEFAULT_TIME_RANGE, toDayKey } from './availabilityUtils';
import { DEFAULT_STEP_DURATION_MIN } from './planningUtils';

/** Where an activity of the pool lands in the programme. */
export interface ProgrammePlacement {
  scheduledFor: string;
  durationMin: number;
}

const MINUTE_MS = 60_000;

/** Steps in the order the programme shows them (chronological). */
export const sortProgrammeSteps = (steps: ReadonlyArray<PlannedOutingRow>): PlannedOutingRow[] =>
  [...steps].sort(
    (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
  );

const stepEnd = (step: PlannedOutingRow): Date =>
  new Date(
    new Date(step.scheduled_for).getTime() +
      (step.duration_min && step.duration_min > 0 ? step.duration_min : DEFAULT_STEP_DURATION_MIN) *
        MINUTE_MS,
  );

/**
 * Start of an activity dropped in an empty programme: the outing's date, else the first
 * candidate day at the default evening start, else today at that time.
 * @param outing the outing (its chosen date).
 * @param days candidate days of the outing.
 * @param now current date (today's fallback).
 */
export const defaultProgrammeStart = (
  outing: Pick<OutingRow, 'start_date'>,
  days: ReadonlyArray<DayKey>,
  now: Date,
): string => {
  if (outing.start_date) return new Date(outing.start_date).toISOString();
  const firstDay = [...days].sort()[0] ?? toDayKey(now);
  return buildStartDate(firstDay, DEFAULT_TIME_RANGE.start);
};

/**
 * Placement of an activity dropped at `index` of the programme (0 = before the first step,
 * `steps.length` = after the last one). It starts when the closest non-cancelled step above it
 * ends (or at the next non-cancelled step's time when nothing is above). The database moves the
 * steps it overlaps (`place_outing_activity`).
 * @param steps steps of the outing, in programme order (`sortProgrammeSteps`).
 * @param index drop position.
 * @param emptyStart start used when the programme has no step (`defaultProgrammeStart`).
 */
export const placementAt = (
  steps: ReadonlyArray<PlannedOutingRow>,
  index: number,
  emptyStart: string,
): ProgrammePlacement => {
  const position = Math.max(0, Math.min(index, steps.length));
  const isActive = (step: PlannedOutingRow) => step.status !== 'cancelled';
  const before = steps.slice(0, position).filter(isActive).pop();
  const after = steps.slice(position).find(isActive);
  const start = before
    ? stepEnd(before)
    : after
      ? new Date(after.scheduled_for)
      : new Date(emptyStart);

  return { scheduledFor: start.toISOString(), durationMin: DEFAULT_STEP_DURATION_MIN };
};
