import {
  areValidOpeningPeriods,
  formatOpeningPeriods,
  isOpenAt,
  isValidOpeningPeriod,
  parseOpeningPeriods,
  toWeekDay,
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

describe('isOpenAt', () => {
  // 2026-11-30 is a Monday (day 0)
  const at = (iso: string) => new Date(iso);
  const periods: OpeningPeriod[] = [
    { day: 0, open: '12:00', close: '14:00' },
    { day: 4, open: '19:00', close: '02:00' },
  ];

  it('maps JavaScript days to Monday-first week days', () => {
    expect(toWeekDay(at('2026-11-30T10:00:00'))).toBe(0);
    expect(toWeekDay(at('2026-12-06T10:00:00'))).toBe(6);
  });

  it('is open inside a period and closed at its end', () => {
    expect(isOpenAt(periods, at('2026-11-30T12:30:00'))).toBe(true);
    expect(isOpenAt(periods, at('2026-11-30T14:00:00'))).toBe(false);
    expect(isOpenAt(periods, at('2026-11-30T11:59:00'))).toBe(false);
  });

  it('handles a period ending after midnight, on both days', () => {
    expect(isOpenAt(periods, at('2026-12-04T23:30:00'))).toBe(true);
    expect(isOpenAt(periods, at('2026-12-05T01:30:00'))).toBe(true);
    expect(isOpenAt(periods, at('2026-12-05T02:00:00'))).toBe(false);
  });

  it('is closed without periods', () => {
    expect(isOpenAt([], at('2026-11-30T12:30:00'))).toBe(false);
  });
});
