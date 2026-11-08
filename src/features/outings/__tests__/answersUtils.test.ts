import { OutingAnswerRow } from '@/shared/types';
import {
  answersToColumns,
  daysFromPeriod,
  EMPTY_ANSWERS,
  hasAnswersFor,
  periodFromDays,
  rowToMemberAnswers,
  toggleChoice,
  validateAnswers,
} from '../utils/answersUtils';

const ROW: OutingAnswerRow = {
  id: 'a1',
  outing_id: 'o1',
  user_id: 'alice',
  activity_type: 'drinks',
  place_wish: null,
  preferred_time: '19:30:00',
  eat_before: false,
  day_preferences: ['evening', 'unknown', 'morning'],
  period_start: null,
  period_end: null,
  budget: null,
  wishes: ['beach', 'nope'],
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

describe('rowToMemberAnswers', () => {
  it('convertit la ligne, normalise l’heure et écarte les valeurs inconnues', () => {
    expect(rowToMemberAnswers(ROW)).toEqual({
      userId: 'alice',
      activityType: 'drinks',
      placeWish: '',
      preferredTime: '19:30',
      eatBefore: false,
      dayPreferences: ['morning', 'evening'],
      periodStart: null,
      periodEnd: null,
      budget: null,
      wishes: ['beach'],
    });
  });
});

describe('answersToColumns', () => {
  it('transforme un lieu vide en null et rogne le texte', () => {
    expect(answersToColumns({ ...EMPTY_ANSWERS, placeWish: '   ' }).place_wish).toBeNull();
    expect(answersToColumns({ ...EMPTY_ANSWERS, placeWish: ' Bastille ' }).place_wish).toBe('Bastille');
  });

  it('reprend chaque réponse dans sa colonne', () => {
    expect(
      answersToColumns({ ...EMPTY_ANSWERS, budget: 'high', wishes: ['city'] }),
    ).toMatchObject({ budget: 'high', wishes: ['city'], eat_before: null });
  });
});

describe('period helpers', () => {
  it('prend le premier et le dernier jour sélectionnés', () => {
    expect(periodFromDays(['2026-12-05', '2026-12-01', '2026-12-03'])).toEqual({
      periodStart: '2026-12-01',
      periodEnd: '2026-12-05',
    });
  });

  it('renvoie une période vide sans jour', () => {
    expect(periodFromDays([])).toEqual({ periodStart: null, periodEnd: null });
  });

  it('ne liste qu’une fois un séjour d’un seul jour', () => {
    expect(daysFromPeriod({ periodStart: '2026-12-01', periodEnd: '2026-12-01' })).toEqual(['2026-12-01']);
    expect(daysFromPeriod({ periodStart: null, periodEnd: null })).toEqual([]);
  });
});

describe('validateAnswers', () => {
  it('n’exige aucune réponse pour une sortie précise', () => {
    expect(validateAnswers('precise', EMPTY_ANSWERS)).toBeNull();
  });

  it('exige une préférence pour une journée', () => {
    expect(validateAnswers('one_day', EMPTY_ANSWERS)).not.toBeNull();
    expect(validateAnswers('one_day', { ...EMPTY_ANSWERS, dayPreferences: ['outdoor'] })).toBeNull();
  });

  it('exige une période pour des vacances', () => {
    expect(validateAnswers('holidays', EMPTY_ANSWERS)).not.toBeNull();
    expect(
      validateAnswers('holidays', { ...EMPTY_ANSWERS, periodStart: '2026-12-01', periodEnd: '2026-12-08' }),
    ).toBeNull();
  });
});

describe('toggleChoice', () => {
  it('efface le choix quand on touche de nouveau la valeur sélectionnée', () => {
    expect(toggleChoice('food', 'food')).toBeNull();
    expect(toggleChoice('food', 'drinks')).toBe('drinks');
    expect(toggleChoice(null, 'food')).toBe('food');
  });
});

describe('hasAnswersFor', () => {
  it('ignore un formulaire vide ou rempli pour un autre type', () => {
    expect(hasAnswersFor('precise', EMPTY_ANSWERS)).toBe(false);
    expect(hasAnswersFor('precise', { ...EMPTY_ANSWERS, placeWish: '  ' })).toBe(false);
    expect(hasAnswersFor('holidays', { ...EMPTY_ANSWERS, eatBefore: true })).toBe(false);
  });

  it('reconnaît une réponse propre au type', () => {
    expect(hasAnswersFor('precise', { ...EMPTY_ANSWERS, eatBefore: false })).toBe(true);
    expect(hasAnswersFor('one_day', { ...EMPTY_ANSWERS, dayPreferences: ['indoor'] })).toBe(true);
    expect(
      hasAnswersFor('holidays', { ...EMPTY_ANSWERS, periodStart: '2026-12-01', periodEnd: '2026-12-05' }),
    ).toBe(true);
  });
});
