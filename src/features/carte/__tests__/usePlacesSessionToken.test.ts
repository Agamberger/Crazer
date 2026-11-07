import { renderHook } from '@testing-library/react-native';
import {
  PLACES_SESSION_TTL_MS,
  usePlacesSessionToken,
} from '../hooks/usePlacesSessionToken';
import * as googlePlacesService from '../services/googlePlacesService';

jest.mock('../services/googlePlacesService');

const mockGoogleService = googlePlacesService as jest.Mocked<typeof googlePlacesService>;

describe('usePlacesSessionToken', () => {
  let now = 1_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    mockGoogleService.createPlacesSessionToken
      .mockReset()
      .mockReturnValueOnce('session-1')
      .mockReturnValueOnce('session-2');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('réutilise le même jeton pendant une session', () => {
    const { result } = renderHook(() => usePlacesSessionToken());

    expect(result.current.getToken()).toBe('session-1');
    now += 10_000;
    expect(result.current.getToken()).toBe('session-1');
  });

  it("renouvelle le jeton après la fin d'une session", () => {
    const { result } = renderHook(() => usePlacesSessionToken());

    expect(result.current.getToken()).toBe('session-1');
    result.current.endSession();
    expect(result.current.getToken()).toBe('session-2');
  });

  it('renouvelle un jeton expiré (recherche abandonnée puis reprise plus tard)', () => {
    const { result } = renderHook(() => usePlacesSessionToken());

    expect(result.current.getToken()).toBe('session-1');
    now += PLACES_SESSION_TTL_MS + 1;
    expect(result.current.getToken()).toBe('session-2');
  });
});
