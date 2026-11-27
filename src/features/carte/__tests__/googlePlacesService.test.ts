import { createPlacesSessionToken } from '../services/googlePlacesService';

describe('createPlacesSessionToken', () => {
  test('génère des jetons UUID v4 distincts', () => {
    const a = createPlacesSessionToken();
    const b = createPlacesSessionToken();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
