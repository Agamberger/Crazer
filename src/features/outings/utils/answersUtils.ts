import { OutingAnswerRow, OutingType } from '@/shared/types';
import { DAY_PREFERENCE_OPTIONS, HOLIDAY_WISH_OPTIONS } from '../questionOptions';
import { DayKey } from '../types/scheduling';
import { DayPreference, HolidayWish, MemberAnswers, OutingAnswers } from '../types/questions';
import { normalizeTime } from './availabilityUtils';

export const EMPTY_ANSWERS: OutingAnswers = {
  activityType: null,
  placeWish: '',
  preferredTime: null,
  eatBefore: null,
  dayPreferences: [],
  periodStart: null,
  periodEnd: null,
  budget: null,
  wishes: [],
};

export const PLACE_WISH_MAX_LENGTH = 200;

/** Keeps only the values of `raw` that belong to `allowed` (database text arrays are untyped). */
const narrowValues = <T extends string>(raw: ReadonlyArray<string>, allowed: ReadonlyArray<T>): T[] =>
  allowed.filter((value) => raw.includes(value));

const DAY_PREFERENCE_VALUES: ReadonlyArray<DayPreference> = DAY_PREFERENCE_OPTIONS.map((o) => o.value);
const HOLIDAY_WISH_VALUES: ReadonlyArray<HolidayWish> = HOLIDAY_WISH_OPTIONS.map((o) => o.value);

/** Converts a database row into the typed answers of a member. */
export const rowToMemberAnswers = (row: OutingAnswerRow): MemberAnswers => ({
  userId: row.user_id,
  activityType: row.activity_type,
  placeWish: row.place_wish ?? '',
  preferredTime: row.preferred_time ? normalizeTime(row.preferred_time) : null,
  eatBefore: row.eat_before,
  dayPreferences: narrowValues(row.day_preferences, DAY_PREFERENCE_VALUES),
  periodStart: row.period_start,
  periodEnd: row.period_end,
  budget: row.budget,
  wishes: narrowValues(row.wishes, HOLIDAY_WISH_VALUES),
});

/** Payload (without `outing_id` / `user_id`) written to `outing_answers`. */
export const answersToColumns = (answers: OutingAnswers) => ({
  activity_type: answers.activityType,
  place_wish: answers.placeWish.trim() || null,
  preferred_time: answers.preferredTime,
  eat_before: answers.eatBefore,
  day_preferences: answers.dayPreferences,
  period_start: answers.periodStart,
  period_end: answers.periodEnd,
  budget: answers.budget,
  wishes: answers.wishes,
});

/** First and last day of a selection, `null` bounds when empty. */
export const periodFromDays = (days: ReadonlyArray<DayKey>): Pick<OutingAnswers, 'periodStart' | 'periodEnd'> => {
  if (days.length === 0) return { periodStart: null, periodEnd: null };
  const sorted = [...days].sort();
  return { periodStart: sorted[0], periodEnd: sorted[sorted.length - 1] };
};

/** Days to show as selected in the calendar for a period (its two bounds). */
export const daysFromPeriod = (answers: Pick<OutingAnswers, 'periodStart' | 'periodEnd'>): DayKey[] =>
  [...new Set([answers.periodStart, answers.periodEnd].filter((d): d is DayKey => d !== null))];

/** Whether `answers` contain at least one answer to the questions of `type`. */
export const hasAnswersFor = (type: OutingType, answers: OutingAnswers): boolean => {
  switch (type) {
    case 'precise':
      return (
        answers.activityType !== null ||
        answers.placeWish.trim().length > 0 ||
        answers.preferredTime !== null ||
        answers.eatBefore !== null
      );
    case 'one_day':
      return answers.dayPreferences.length > 0;
    case 'holidays':
      return answers.periodStart !== null && answers.periodEnd !== null;
  }
};

/** Returns the message explaining what is missing, or `null` when the answers can be saved. */
export const validateAnswers = (type: OutingType, answers: OutingAnswers): string | null => {
  switch (type) {
    case 'precise':
      return null;
    case 'one_day':
      return answers.dayPreferences.length === 0 ? 'Choisis au moins une préférence.' : null;
    case 'holidays':
      return answers.periodStart === null || answers.periodEnd === null
        ? 'Choisis la période (premier et dernier jour).'
        : null;
  }
};


/** Value to store after pressing `selected` on a single-choice question: pressing it again clears it. */
export const toggleChoice = <T extends string>(current: T | null, selected: T): T | null =>
  current === selected ? null : selected;
