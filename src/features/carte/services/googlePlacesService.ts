/**
 * Google Places session tokens. The requests themselves live in `./googlePlaces`.
 */

/**
 * Google Places session token (UUID v4): groups the autocomplete requests and the details
 * request that ends them into one billed session. Renew it after each selection.
 *
 * @returns a new token
 */
export function createPlacesSessionToken(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}
