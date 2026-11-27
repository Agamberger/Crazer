import { GooglePlacesError } from './googlePlacesError';

/** Time during which no Google request is sent after a quota error (ms). */
export const QUOTA_COOLDOWN_MS = 5 * 60 * 1000;

/** Stops calling Google for a while once it answered that the quota is exceeded. */
export interface QuotaGuard {
  /** @throws GooglePlacesError `quota_exceeded` while the cooldown runs */
  assertAvailable: () => void;
  /** Starts the cooldown. */
  reportQuotaExceeded: () => void;
  /** Ends the cooldown (tests, logout). */
  reset: () => void;
}

/**
 * Creates a quota guard.
 *
 * @param cooldownMs - duration of the pause after a quota error
 * @param now - clock, injectable for tests
 * @returns the guard
 */
export function createQuotaGuard(
  cooldownMs: number = QUOTA_COOLDOWN_MS,
  now: () => number = Date.now,
): QuotaGuard {
  let blockedUntil = 0;
  return {
    assertAvailable: () => {
      if (now() < blockedUntil) {
        throw new GooglePlacesError('quota_exceeded', 'cooldown after a quota error');
      }
    },
    reportQuotaExceeded: () => {
      blockedUntil = now() + cooldownMs;
    },
    reset: () => {
      blockedUntil = 0;
    },
  };
}
