import { GooglePlacesErrorKind } from './googlePlacesTypes';

/** French message shown to the user for each failure kind. */
const USER_MESSAGES: Record<GooglePlacesErrorKind, string> = {
  missing_key: 'La recherche Google n’est pas configurée.',
  invalid_key: 'La recherche Google est indisponible (clé refusée).',
  quota_exceeded: 'Infos Google momentanément indisponibles. Réessaie dans quelques minutes.',
  not_found: 'Ce lieu n’existe plus sur Google Maps.',
  invalid_request: 'Recherche Google invalide.',
  network: 'Pas de connexion à Google. Vérifie ton réseau.',
  invalid_response: 'Réponse Google inattendue.',
};

/** A failed Google Places request, typed by cause. */
export class GooglePlacesError extends Error {
  readonly kind: GooglePlacesErrorKind;

  /**
   * @param kind - cause of the failure
   * @param detail - technical detail for logs (never shown to the user)
   */
  constructor(kind: GooglePlacesErrorKind, detail?: string) {
    super(detail ? `[google-places:${kind}] ${detail}` : `[google-places:${kind}]`);
    this.name = 'GooglePlacesError';
    this.kind = kind;
  }

  /** French message safe to show to the user. */
  get userMessage(): string {
    return USER_MESSAGES[this.kind];
  }
}

/**
 * Narrows any thrown value to a Google Places failure kind.
 *
 * @param error - value caught in a `catch`
 * @returns its kind, or `network` for anything that is not a `GooglePlacesError`
 */
export function toGooglePlacesErrorKind(error: unknown): GooglePlacesErrorKind {
  return error instanceof GooglePlacesError ? error.kind : 'network';
}

/**
 * Maps an HTTP status and Google error status to a failure kind.
 *
 * @param httpStatus - HTTP status code of the response
 * @param googleStatus - `error.status` of the JSON body, when present
 * @returns the failure kind
 */
export function errorKindFromResponse(
  httpStatus: number,
  googleStatus: string | undefined,
): GooglePlacesErrorKind {
  if (httpStatus === 429 || googleStatus === 'RESOURCE_EXHAUSTED') return 'quota_exceeded';
  if (httpStatus === 404 || googleStatus === 'NOT_FOUND') return 'not_found';
  if (httpStatus === 401 || httpStatus === 403 || googleStatus === 'PERMISSION_DENIED') {
    return 'invalid_key';
  }
  if (httpStatus === 400 || googleStatus === 'INVALID_ARGUMENT') return 'invalid_request';
  return 'network';
}
