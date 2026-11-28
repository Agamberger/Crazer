/**
 * Random UUID v4, for ids chosen by the app before saving (e.g. file names).
 *
 * @returns a new UUID such as `3b241101-e2bb-4255-8caf-4136c566a962`
 */
export function createUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}
