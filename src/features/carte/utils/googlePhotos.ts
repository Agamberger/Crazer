/**
 * Photos Google Places : la clé API ne doit jamais être persistée en base.
 *
 * - En base, une photo Google est stockée sous la forme `google-photo:<photo_reference>`.
 * - À l'affichage, l'URL complète est reconstruite avec la clé configurée dans l'app.
 */

export const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
export const GOOGLE_PHOTO_PREFIX = 'google-photo:';
const GOOGLE_PHOTO_MAX_WIDTH = 800;

/** Clé Google Places publique de l'app (vide si non configurée). */
export function getGooglePlacesApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
}

/** URL d'affichage d'une photo Google à partir de sa `photo_reference`. */
export function buildGooglePhotoUrl(photoReference: string): string {
  const params = new URLSearchParams({
    maxwidth: String(GOOGLE_PHOTO_MAX_WIDTH),
    photo_reference: photoReference,
    key: getGooglePlacesApiKey(),
  });
  return `${GOOGLE_PLACES_BASE_URL}/photo?${params.toString()}`;
}

const isGoogleApiUrl = (url: URL): boolean => url.hostname === 'maps.googleapis.com';

/**
 * Valeur à persister pour une image : référence pour une photo Google,
 * URL Google nettoyée de sa clé, ou URL tierce inchangée.
 */
export function toStorableImageRef(imageUrl: string): string {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return imageUrl;
  }
  if (!isGoogleApiUrl(url)) return imageUrl;

  const photoReference = url.searchParams.get('photo_reference');
  if (url.pathname.endsWith('/place/photo') && photoReference) {
    return `${GOOGLE_PHOTO_PREFIX}${photoReference}`;
  }

  url.searchParams.delete('key');
  return url.toString();
}

/**
 * URL affichable d'une image stockée. Retourne `null` pour une référence Google
 * lorsqu'aucune clé n'est configurée (l'image ne pourrait pas se charger).
 */
export function toDisplayImageUrl(storedImage: string): string | null {
  if (!storedImage.startsWith(GOOGLE_PHOTO_PREFIX)) return storedImage;
  if (!getGooglePlacesApiKey()) return null;
  return buildGooglePhotoUrl(storedImage.slice(GOOGLE_PHOTO_PREFIX.length));
}
