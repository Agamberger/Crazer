/**
 * In-memory cache for the current app session, with a time to live and a size cap
 * (least recently used entries are dropped first). Nothing is written to disk.
 */
export interface SessionMemoryCache<T> {
  /** @returns the cached value, or `undefined` when missing or expired */
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  delete: (key: string) => void;
  clear: () => void;
  /** Number of entries (expired ones included until read). */
  size: () => number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Creates a session memory cache.
 *
 * @param maxEntries - maximum number of entries kept
 * @param ttlMs - time to live of an entry
 * @param now - clock, injectable for tests
 * @returns the cache
 */
export function createSessionMemoryCache<T>(
  maxEntries: number,
  ttlMs: number,
  now: () => number = Date.now,
): SessionMemoryCache<T> {
  const entries = new Map<string, CacheEntry<T>>();

  return {
    get: (key) => {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      // Re-insert to mark the entry as most recently used.
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set: (key, value) => {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > maxEntries) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) break;
        entries.delete(oldestKey);
      }
    },
    delete: (key) => {
      entries.delete(key);
    },
    clear: () => entries.clear(),
    size: () => entries.size,
  };
}
