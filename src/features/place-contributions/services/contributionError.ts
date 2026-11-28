/** Why a contribution request failed. */
export type ContributionErrorKind =
  'not_authenticated' | 'forbidden' | 'not_found' | 'invalid' | 'quota_reached' | 'network';

const USER_MESSAGES: Record<ContributionErrorKind, string> = {
  not_authenticated: 'Connecte-toi pour contribuer.',
  forbidden: 'Tu ne peux pas faire ça.',
  not_found: 'Ce contenu n’existe plus.',
  invalid: 'Contribution invalide.',
  quota_reached: 'Limite atteinte pour le moment. Réessaie plus tard.',
  network: 'Impossible de joindre Crazer. Vérifie ta connexion.',
};

/** Postgres / PostgREST error codes raised by the contribution tables and RPCs. */
const KIND_BY_CODE: Record<string, ContributionErrorKind> = {
  '42501': 'forbidden',
  P0002: 'not_found',
  '22023': 'invalid',
  '23514': 'invalid',
  '23505': 'invalid',
  '54000': 'quota_reached',
};

/** A failed contribution request, typed by cause, with a French message for the user. */
export class ContributionError extends Error {
  readonly kind: ContributionErrorKind;

  /**
   * @param kind - cause of the failure
   * @param detail - technical detail for logs (never shown to the user)
   */
  constructor(kind: ContributionErrorKind, detail?: string) {
    super(detail ? `[contributions:${kind}] ${detail}` : `[contributions:${kind}]`);
    this.name = 'ContributionError';
    this.kind = kind;
  }

  /** French message safe to show to the user. */
  get userMessage(): string {
    return USER_MESSAGES[this.kind];
  }
}

/** Shape of a Supabase error (PostgREST or Storage). */
export interface SupabaseErrorLike {
  message: string;
  code?: string;
}

/**
 * Converts a Supabase error into a typed contribution error.
 *
 * @param error - error returned by the Supabase client
 * @returns the matching `ContributionError` (`network` for unknown codes)
 */
export function toContributionError(error: SupabaseErrorLike): ContributionError {
  const kind = (error.code && KIND_BY_CODE[error.code]) || 'network';
  return new ContributionError(kind, error.message);
}
