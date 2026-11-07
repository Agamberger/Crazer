import { OutingRow } from '@/shared/types';
import { getFirstName, getGreeting, getNextOuting } from '../utils/homeUtils';

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
