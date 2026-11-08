import { OutingActivityType, OutingBudget } from '@/shared/types';
import { DayKey } from './scheduling';

/** Preferences asked for a `one_day` outing (stored in `outing_answers.day_preferences`). */
export type DayPreference =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'outdoor'
  | 'indoor'
  | 'active'
  | 'relaxed';

/** Wishes asked for a `holidays` outing (stored in `outing_answers.wishes`). */
export type HolidayWish = 'beach' | 'mountain' | 'city' | 'culture' | 'party' | 'relax';

/** The guided answers of one member. Which fields are used depends on the outing type. */
export interface OutingAnswers {
  activityType: OutingActivityType | null;
  placeWish: string;
  /** precise: preferred time, `HH:mm`. */
  preferredTime: string | null;
  /** precise: « Manger avant ? » (`null` = not answered). */
  eatBefore: boolean | null;
  dayPreferences: DayPreference[];
  /** holidays: first and last day of the period. */
  periodStart: DayKey | null;
  periodEnd: DayKey | null;
  budget: OutingBudget | null;
  wishes: HolidayWish[];
}

/** Answers of a member of the outing. */
export interface MemberAnswers extends OutingAnswers {
  userId: string;
}
