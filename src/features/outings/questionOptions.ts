import { ChipOption } from '@/shared/components';
import { OutingActivityType, OutingBudget, OutingType } from '@/shared/types';
import { DayPreference, HolidayWish } from './types/questions';

export interface OutingTypeOption {
  value: OutingType;
  label: string;
  emoji: string;
  description: string;
}

export const OUTING_TYPE_OPTIONS: ReadonlyArray<OutingTypeOption> = [
  {
    value: 'precise',
    label: 'Sortie précise',
    emoji: '🎯',
    description: 'Une activité, un lieu et une heure à caler.',
  },
  {
    value: 'one_day',
    label: 'Une journée',
    emoji: '☀️',
    description: 'Une journée entière à organiser ensemble.',
  },
  {
    value: 'holidays',
    label: 'Vacances',
    emoji: '🏝️',
    description: 'Plusieurs jours : période, budget et envies.',
  },
];

export const OUTING_TYPE_LABELS: Record<OutingType, string> = {
  precise: 'Sortie précise',
  one_day: 'Une journée',
  holidays: 'Vacances',
};

export const YES_NO_OPTIONS: ReadonlyArray<ChipOption<'yes' | 'no'>> = [
  { value: 'yes', label: 'Oui', emoji: '👍' },
  { value: 'no', label: 'Non', emoji: '👎' },
];

export const ACTIVITY_TYPE_OPTIONS: ReadonlyArray<ChipOption<OutingActivityType>> = [
  { value: 'food', label: 'Restau', emoji: '🍽️' },
  { value: 'drinks', label: 'Verres', emoji: '🍻' },
  { value: 'sport', label: 'Sport', emoji: '⚽' },
  { value: 'culture', label: 'Culture', emoji: '🎭' },
  { value: 'party', label: 'Soirée', emoji: '🎉' },
  { value: 'nature', label: 'Nature', emoji: '🌳' },
  { value: 'other', label: 'Autre', emoji: '✨' },
];

/** Preferred start times offered for a precise outing (`HH:mm`). */
export const PREFERRED_TIME_OPTIONS: ReadonlyArray<ChipOption<string>> = [
  '12:00',
  '14:00',
  '17:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
].map((time) => ({ value: time, label: time }));

export const DAY_PREFERENCE_OPTIONS: ReadonlyArray<ChipOption<DayPreference>> = [
  { value: 'morning', label: 'Matin', emoji: '🌅' },
  { value: 'afternoon', label: 'Après-midi', emoji: '🌤️' },
  { value: 'evening', label: 'Soirée', emoji: '🌙' },
  { value: 'outdoor', label: 'Dehors', emoji: '🌳' },
  { value: 'indoor', label: 'À l’abri', emoji: '🏠' },
  { value: 'active', label: 'Actif', emoji: '🏃' },
  { value: 'relaxed', label: 'Tranquille', emoji: '😌' },
];

export const BUDGET_OPTIONS: ReadonlyArray<ChipOption<OutingBudget>> = [
  { value: 'low', label: 'Serré', emoji: '💸' },
  { value: 'medium', label: 'Raisonnable', emoji: '💶' },
  { value: 'high', label: 'On se fait plaisir', emoji: '💎' },
];

export const HOLIDAY_WISH_OPTIONS: ReadonlyArray<ChipOption<HolidayWish>> = [
  { value: 'beach', label: 'Plage', emoji: '🏖️' },
  { value: 'mountain', label: 'Montagne', emoji: '🏔️' },
  { value: 'city', label: 'Ville', emoji: '🏙️' },
  { value: 'culture', label: 'Culture', emoji: '🏛️' },
  { value: 'party', label: 'Fête', emoji: '🎉' },
  { value: 'relax', label: 'Détente', emoji: '🧘' },
];
