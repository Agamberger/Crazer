import { Json } from '@/shared/types';
import { OpeningPeriod, WeekDay } from '../types/contributions';

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
/** Same limit as the SQL check `is_valid_opening_periods`. */
export const MAX_OPENING_PERIODS = 21;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWeekDay = (value: unknown): value is WeekDay =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && TIME_PATTERN.test(value);

/**
 * Checks one period with the same rules as the database.
 *
 * @param period - period to check
 * @returns `true` when its day and times are valid and differ
 */
export function isValidOpeningPeriod(period: OpeningPeriod): boolean {
  return (
    isWeekDay(period.day) &&
    isTime(period.open) &&
    isTime(period.close) &&
    period.open !== period.close
  );
}

/**
 * Checks a full week of periods before sending it.
 *
 * @param periods - periods to check
 * @returns `true` when every period is valid and there are at most 21
 */
export function areValidOpeningPeriods(periods: readonly OpeningPeriod[]): boolean {
  return periods.length <= MAX_OPENING_PERIODS && periods.every(isValidOpeningPeriod);
}

/**
 * Narrows the JSON stored in `place_hours_proposals.periods`.
 *
 * @param value - JSON read from the database
 * @returns the valid periods, sorted by day then opening time (invalid entries are dropped)
 */
export function parseOpeningPeriods(value: Json | unknown): OpeningPeriod[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry): OpeningPeriod[] => {
      if (!isRecord(entry)) return [];
      const { day, open, close } = entry;
      if (!isWeekDay(day) || !isTime(open) || !isTime(close) || open === close) return [];
      return [{ day, open, close }];
    })
    .sort((a, b) => a.day - b.day || a.open.localeCompare(b.open));
}

/**
 * Converts periods to the JSON sent to the database.
 *
 * @param periods - periods to send
 * @returns plain JSON objects
 */
export function toOpeningPeriodsJson(periods: readonly OpeningPeriod[]): Json {
  return periods.map(({ day, open, close }) => ({ day, open, close }));
}

const DAY_LABELS: Record<WeekDay, string> = {
  0: 'lundi',
  1: 'mardi',
  2: 'mercredi',
  3: 'jeudi',
  4: 'vendredi',
  5: 'samedi',
  6: 'dimanche',
};

const WEEK: readonly WeekDay[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * One French line per day, the format of the place card (« lundi: 12:00 – 14:30, 19:00 – 23:00 »).
 *
 * @param periods - opening periods of the week
 * @returns seven lines, « fermé » for a day without period
 */
export function formatOpeningPeriods(periods: readonly OpeningPeriod[]): string[] {
  return WEEK.map((day) => {
    const ofDay = periods.filter((period) => period.day === day);
    const text = ofDay.length
      ? ofDay.map((period) => `${period.open} – ${period.close}`).join(', ')
      : 'fermé';
    return `${DAY_LABELS[day]}: ${text}`;
  });
}

const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Day of the week of a date, 0 = Monday … 6 = Sunday.
 *
 * @param date - local date
 * @returns the week day
 */
export function toWeekDay(date: Date): WeekDay {
  return ((date.getDay() + 6) % 7) as WeekDay;
}

/**
 * Whether the place is open at a given moment, including periods started the day before
 * and ending after midnight.
 *
 * @param periods - opening periods of the week
 * @param date - moment to check (local time)
 * @returns `true` when a period covers that moment
 */
export function isOpenAt(periods: readonly OpeningPeriod[], date: Date): boolean {
  const today = toWeekDay(date);
  const yesterday = ((today + 6) % 7) as WeekDay;
  const now = date.getHours() * 60 + date.getMinutes();
  return periods.some((period) => {
    const open = toMinutes(period.open);
    const close = toMinutes(period.close);
    const isOvernight = close < open;
    if (period.day === today) return isOvernight ? now >= open : now >= open && now < close;
    return period.day === yesterday && isOvernight && now < close;
  });
}
