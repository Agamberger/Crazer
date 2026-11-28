import {
  areValidOpeningPeriods,
  formatOpeningPeriods,
  isValidOpeningPeriod,
  parseOpeningPeriods,
  toOpeningPeriodsJson,
} from '../utils/openingPeriods';
import { OpeningPeriod } from '../types/contributions';

describe('openingPeriods', () => {
  it('accepts valid periods, including one ending after midnight', () => {
    expect(isValidOpeningPeriod({ day: 0, open: '12:00', close: '14:30' })).toBe(true);
    expect(isValidOpeningPeriod({ day: 5, open: '19:00', close: '02:00' })).toBe(true);
  });

  it('rejects a bad day, a bad time or an empty period', () => {
    expect(
      isValidOpeningPeriod({ day: 7 as OpeningPeriod['day'], open: '12:00', close: '14:00' }),
    ).toBe(false);
    expect(isValidOpeningPeriod({ day: 1, open: '24:00', close: '14:00' })).toBe(false);
    expect(isValidOpeningPeriod({ day: 1, open: '9:00', close: '14:00' })).toBe(false);
    expect(isValidOpeningPeriod({ day: 1, open: '10:00', close: '10:00' })).toBe(false);
  });

  it('limits a week to 21 periods', () => {
    const period: OpeningPeriod = { day: 0, open: '10:00', close: '11:00' };
    expect(areValidOpeningPeriods(Array(21).fill(period))).toBe(true);
    expect(areValidOpeningPeriods(Array(22).fill(period))).toBe(false);
  });

  it('parses stored JSON, drops invalid entries and sorts by day then time', () => {
    expect(
      parseOpeningPeriods([
        { day: 2, open: '19:00', close: '23:00' },
        { day: 0, open: '12:00', close: '14:00' },
        { day: 2, open: '12:00', close: '14:00' },
        { day: 9, open: '12:00', close: '14:00' },
        'nope',
        { day: 1, open: '12:00' },
      ]),
    ).toEqual([
      { day: 0, open: '12:00', close: '14:00' },
      { day: 2, open: '12:00', close: '14:00' },
      { day: 2, open: '19:00', close: '23:00' },
    ]);
    expect(parseOpeningPeriods({ day: 1 })).toEqual([]);
  });

  it('serialises only the known fields', () => {
    const withExtra = { day: 1, open: '10:00', close: '12:00', extra: true } as OpeningPeriod;
    expect(toOpeningPeriodsJson([withExtra])).toEqual([{ day: 1, open: '10:00', close: '12:00' }]);
  });

  it('formats one French line per day', () => {
    const lines = formatOpeningPeriods([
      { day: 0, open: '12:00', close: '14:00' },
      { day: 0, open: '19:00', close: '23:00' },
    ]);
    expect(lines).toHaveLength(7);
    expect(lines[0]).toBe('lundi: 12:00 – 14:00, 19:00 – 23:00');
    expect(lines[6]).toBe('dimanche: fermé');
  });
});
