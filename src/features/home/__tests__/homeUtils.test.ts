import { OutingRow } from '@/shared/types';
import {
  formatUpcomingDate,
  getFirstName,
  getGreeting,
  getNextOuting,
  getUpcomingOutings,
} from '../utils/homeUtils';

const makeOuting = (overrides: Partial<OutingRow>): OutingRow => ({
  id: 'o',
  title: 'Sortie',
  description: null,
  start_date: '2026-09-01T00:00:00Z',
  created_by: 'user-1',
  status: 'planned',
  cover_image: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const NOW = new Date('2026-09-05T12:00:00Z');

describe('getNextOuting', () => {
  test('retourne null sans sortie active', () => {
    expect(getNextOuting([], NOW)).toBeNull();
    expect(
      getNextOuting(
        [
          makeOuting({ id: 'done', status: 'done', start_date: '2026-09-10T18:00:00Z' }),
          makeOuting({ id: 'cancel', status: 'cancelled', start_date: '2026-09-11T18:00:00Z' }),
        ],
        NOW
      )
    ).toBeNull();
  });

  test('choisit la sortie active à venir la plus proche', () => {
    const next = getNextOuting(
      [
        makeOuting({ id: 'far', start_date: '2026-10-01T18:00:00Z' }),
        makeOuting({ id: 'past', start_date: '2026-09-01T18:00:00Z' }),
        makeOuting({ id: 'soon', status: 'draft', start_date: '2026-09-06T18:00:00Z' }),
        makeOuting({ id: 'done-soon', status: 'done', start_date: '2026-09-05T13:00:00Z' }),
      ],
      NOW
    );
    expect(next?.id).toBe('soon');
  });

  test("retombe sur une sortie en cours quand rien n'est à venir", () => {
    const next = getNextOuting(
      [
        makeOuting({ id: 'old-draft', status: 'draft', start_date: '2026-08-01T18:00:00Z' }),
        makeOuting({ id: 'ongoing', status: 'ongoing', start_date: '2026-07-01T18:00:00Z' }),
      ],
      NOW
    );
    expect(next?.id).toBe('ongoing');
  });

  test('retombe sur la sortie active la plus récente sinon', () => {
    const next = getNextOuting(
      [
        makeOuting({ id: 'older', start_date: '2026-07-01T18:00:00Z' }),
        makeOuting({ id: 'recent', start_date: '2026-08-20T18:00:00Z' }),
        makeOuting({ id: 'invalid-date', start_date: 'pas une date' }),
      ],
      NOW
    );
    expect(next?.id).toBe('recent');
  });
});

describe('getGreeting', () => {
  test('dit bonjour en journée et bonsoir le soir ou la nuit', () => {
    expect(getGreeting(new Date(2026, 8, 5, 9))).toBe('Bonjour');
    expect(getGreeting(new Date(2026, 8, 5, 17, 59))).toBe('Bonjour');
    expect(getGreeting(new Date(2026, 8, 5, 18))).toBe('Bonsoir');
    expect(getGreeting(new Date(2026, 8, 5, 2))).toBe('Bonsoir');
  });
});

describe('getFirstName', () => {
  test('prend le premier mot du nom complet', () => {
    expect(getFirstName('  Alice   Dupont ', 'alice@crazer.app')).toBe('Alice');
  });

  test("retombe sur la partie locale de l'email, sinon une chaîne vide", () => {
    expect(getFirstName(null, 'bob@crazer.app')).toBe('bob');
    expect(getFirstName('', undefined)).toBe('');
  });
});

describe('sorties sans date', () => {
  const undated = (id: string, status: OutingRow['status'] = 'draft') =>
    makeOuting({ id, start_date: null, status });

  test('getNextOuting préfère une sortie datée à venir à une sortie sans date', () => {
    const next = getNextOuting(
      [undated('u'), makeOuting({ id: 'd', start_date: '2026-09-10T18:00:00Z' })],
      NOW
    );
    expect(next?.id).toBe('d');
  });

  test('getNextOuting préfère une sortie passée datée à une sortie sans date', () => {
    const next = getNextOuting(
      [undated('u'), makeOuting({ id: 'past', start_date: '2026-09-01T18:00:00Z' })],
      NOW
    );
    expect(next?.id).toBe('past');
  });

  test("getNextOuting met en avant une sortie sans date quand il n'y a rien d'autre", () => {
    expect(getNextOuting([undated('u'), undated('done', 'done')], NOW)?.id).toBe('u');
  });

  test('getUpcomingOutings liste les sorties sans date après les datées', () => {
    const result = getUpcomingOutings(
      [
        undated('u1'),
        makeOuting({ id: 'late', start_date: '2026-09-20T18:00:00Z' }),
        undated('u2'),
        makeOuting({ id: 'soon', start_date: '2026-09-06T18:00:00Z' }),
        undated('cancelled', 'cancelled'),
      ],
      NOW
    );
    expect(result.map((o) => o.id)).toEqual(['soon', 'late', 'u1', 'u2']);
  });

  test('getUpcomingOutings exclut la sortie mise en avant, même sans date', () => {
    expect(getUpcomingOutings([undated('u1'), undated('u2')], NOW, 'u1').map((o) => o.id)).toEqual([
      'u2',
    ]);
  });
});

describe('getUpcomingOutings', () => {
  const at = (id: string, start: string, status: OutingRow['status'] = 'planned') =>
    makeOuting({ id, start_date: start, status });

  test('garde les sorties actives à venir, la plus proche en premier', () => {
    const result = getUpcomingOutings(
      [
        at('late', '2026-09-20T18:00:00Z'),
        at('past', '2026-09-01T18:00:00Z'),
        at('soon', '2026-09-06T18:00:00Z'),
        at('done', '2026-09-07T18:00:00Z', 'done'),
        at('cancelled', '2026-09-08T18:00:00Z', 'cancelled'),
      ],
      NOW
    );
    expect(result.map((o) => o.id)).toEqual(['soon', 'late']);
  });

  test("exclut la sortie déjà mise en avant et limite le nombre d'éléments", () => {
    const outings = Array.from({ length: 8 }, (_, i) =>
      at(`o${i}`, `2026-09-${String(10 + i).padStart(2, '0')}T18:00:00Z`)
    );
    expect(getUpcomingOutings(outings, NOW, 'o0').map((o) => o.id)).toEqual([
      'o1',
      'o2',
      'o3',
      'o4',
      'o5',
    ]);
    expect(getUpcomingOutings(outings, NOW, null, 2)).toHaveLength(2);
  });

  test('ignore les dates invalides', () => {
    expect(getUpcomingOutings([at('bad', 'not-a-date')], NOW)).toEqual([]);
  });
});

describe('formatUpcomingDate', () => {
  test('formate le jour et l’heure en français', () => {
    const value = new Date(2026, 10, 11, 18, 5).toISOString();
    expect(formatUpcomingDate(value)).toMatch(/^mer\.? 11 nov\.? · 18:05$/);
  });

  test('indique « Date à définir » pour une sortie sans date', () => {
    expect(formatUpcomingDate(null)).toBe('Date à définir');
  });

  test('retourne une chaîne vide pour une date invalide', () => {
    expect(formatUpcomingDate('oops')).toBe('');
  });
});
