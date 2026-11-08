import {
  areSlotsValid,
  buildStartDate,
  computeDayRecaps,
  countPendingResponses,
  dayKeyToDate,
  DEFAULT_TIME_RANGE,
  formatDayLabel,
  intersectTimeRanges,
  normalizeTime,
  slotsToPayload,
  syncSlotsWithDays,
  toDayKey,
} from '../utils/availabilityUtils';
import { MemberAvailability, OutingMember } from '../types/scheduling';

const member = (userId: string, status: OutingMember['status'] = 'accepted'): OutingMember => ({
  userId,
  displayName: userId,
  avatarUrl: null,
  status,
  isOrganizer: userId === 'maceo',
});

const slot = (userId: string, day: string, start: string, end: string): MemberAvailability => ({
  userId,
  day,
  start,
  end,
});

describe('availabilityUtils', () => {
  describe('day keys', () => {
    it('convertit une date locale en YYYY-MM-DD sans décalage UTC', () => {
      expect(toDayKey(new Date(2026, 10, 9, 23, 30))).toBe('2026-11-09');
      expect(dayKeyToDate('2026-11-09')).toEqual(new Date(2026, 10, 9));
    });

    it('formate un jour en français', () => {
      expect(formatDayLabel('2026-11-09')).toMatch(/lun/);
    });
  });

  it('normalise une heure Postgres et construit une date de début', () => {
    expect(normalizeTime('18:30:00')).toBe('18:30');
    expect(buildStartDate('2026-11-10', '18:30')).toBe(new Date(2026, 10, 10, 18, 30).toISOString());
  });

  describe('intersectTimeRanges', () => {
    it('retourne le créneau commun', () => {
      expect(
        intersectTimeRanges([
          { start: '12:00', end: '21:00' },
          { start: '13:00', end: '22:00' },
        ]),
      ).toEqual({ start: '13:00', end: '21:00' });
    });

    it('retourne null sans chevauchement ou sans créneau', () => {
      expect(
        intersectTimeRanges([
          { start: '10:00', end: '12:00' },
          { start: '12:00', end: '14:00' },
        ]),
      ).toBeNull();
      expect(intersectTimeRanges([])).toBeNull();
    });
  });

  describe('computeDayRecaps', () => {
    const members = [
      member('maceo'),
      member('elo'),
      member('lili', 'invited'),
      member('dan', 'declined'),
    ];

    it('calcule, par jour trié, les présents et le créneau commun', () => {
      const recaps = computeDayRecaps(
        ['2026-11-11', '2026-11-10'],
        [
          slot('maceo', '2026-11-10', '18:00', '23:00'),
          slot('elo', '2026-11-10', '19:00', '22:00'),
          slot('maceo', '2026-11-11', '12:00', '21:00'),
        ],
        members,
      );

      expect(recaps.map((r) => r.day)).toEqual(['2026-11-10', '2026-11-11']);
      expect(recaps[0].availableMembers.map((m) => m.userId)).toEqual(['maceo', 'elo']);
      expect(recaps[0].commonSlot).toEqual({ start: '19:00', end: '22:00' });
      expect(recaps[1].commonSlot).toEqual({ start: '12:00', end: '21:00' });
    });

    it('ignore les invités sans réponse et ceux qui ont refusé', () => {
      const [recap] = computeDayRecaps(
        ['2026-11-10'],
        [
          slot('maceo', '2026-11-10', '18:00', '23:00'),
          slot('lili', '2026-11-10', '08:00', '09:00'),
          slot('dan', '2026-11-10', '08:00', '09:00'),
        ],
        members,
      );
      expect(recap.availableMembers.map((m) => m.userId)).toEqual(['maceo']);
      expect(recap.commonSlot).toEqual({ start: '18:00', end: '23:00' });
    });

    it('indique l’absence de créneau commun et les jours sans personne', () => {
      const recaps = computeDayRecaps(
        ['2026-11-10', '2026-11-12'],
        [
          slot('maceo', '2026-11-10', '10:00', '12:00'),
          slot('elo', '2026-11-10', '14:00', '16:00'),
        ],
        members,
      );
      expect(recaps[0].availableMembers).toHaveLength(2);
      expect(recaps[0].commonSlot).toBeNull();
      expect(recaps[1].availableMembers).toHaveLength(0);
      expect(recaps[1].commonSlot).toBeNull();
    });
  });

  it('compte les réponses en attente', () => {
    expect(countPendingResponses([member('a', 'invited'), member('b'), member('c', 'invited')])).toBe(2);
  });

  it('valide les créneaux saisis', () => {
    expect(areSlotsValid([], {})).toBe(false);
    expect(areSlotsValid(['d1'], { d1: { start: '18:00', end: '23:00' } })).toBe(true);
    expect(areSlotsValid(['d1'], { d1: { start: '23:00', end: '18:00' } })).toBe(false);
    expect(areSlotsValid(['d1', 'd2'], { d1: { start: '18:00', end: '23:00' } })).toBe(false);
  });

  it('prépare le payload trié et synchronise les créneaux avec les jours', () => {
    const slots = { '2026-11-11': { start: '12:00', end: '13:00' }, '2026-11-10': DEFAULT_TIME_RANGE };
    expect(slotsToPayload(['2026-11-11', '2026-11-10'], slots)).toEqual([
      { day: '2026-11-10', ...DEFAULT_TIME_RANGE },
      { day: '2026-11-11', start: '12:00', end: '13:00' },
    ]);
    expect(syncSlotsWithDays(['2026-11-11', '2026-11-12'], slots)).toEqual({
      '2026-11-11': { start: '12:00', end: '13:00' },
      '2026-11-12': DEFAULT_TIME_RANGE,
    });
  });
});
