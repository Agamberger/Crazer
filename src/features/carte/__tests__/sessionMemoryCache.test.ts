import { createSessionMemoryCache } from '../services/googlePlaces/sessionMemoryCache';
import { createQuotaGuard } from '../services/googlePlaces/quotaGuard';

describe('createSessionMemoryCache', () => {
  let now = 0;
  const clock = () => now;

  beforeEach(() => {
    now = 0;
  });

  it('returns a value until it expires', () => {
    const cache = createSessionMemoryCache<string>(10, 1000, clock);
    cache.set('a', 'A');
    now = 999;
    expect(cache.get('a')).toBe('A');
    now = 1000;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it('drops the least recently used entry beyond its capacity', () => {
    const cache = createSessionMemoryCache<string>(2, 1000, clock);
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.get('a');
    cache.set('c', 'C');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('A');
    expect(cache.get('c')).toBe('C');
  });

  it('deletes and clears entries', () => {
    const cache = createSessionMemoryCache<string>(5, 1000, clock);
    cache.set('a', 'A');
    cache.set('b', 'B');
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe('createQuotaGuard', () => {
  it('blocks requests during the cooldown, then lets them through', () => {
    let now = 0;
    const guard = createQuotaGuard(1000, () => now);
    expect(() => guard.assertAvailable()).not.toThrow();
    guard.reportQuotaExceeded();
    now = 999;
    expect(() => guard.assertAvailable()).toThrow(expect.objectContaining({ kind: 'quota_exceeded' }));
    now = 1000;
    expect(() => guard.assertAvailable()).not.toThrow();
  });

  it('can be reset', () => {
    const guard = createQuotaGuard(1000, () => 0);
    guard.reportQuotaExceeded();
    guard.reset();
    expect(() => guard.assertAvailable()).not.toThrow();
  });
});
