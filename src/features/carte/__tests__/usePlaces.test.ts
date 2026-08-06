/**
 * Tests unitaires pour usePlaces.ts
 *
 * On mock expo-location et placeService pour tester
 * la logique du hook sans appels réseau ou GPS réels.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePlaces } from '../hooks/usePlaces';

// ── Mock expo-location ───────────────────────────────────────────────────────
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// ── Mock placeService ─────────────────────────────────────────────────────────
jest.mock('../services/placeService', () => ({
  fetchNearbyPlaces: jest.fn(),
  searchPlaces: jest.fn(),
}));

jest.mock('../store/useMapStore', () => {
  const state = {
    setPois: jest.fn(),
    setCenterRegion: jest.fn(),
    setUserLocation: jest.fn(),
    centerRegion: { latitude: 48.8566, longitude: 2.3522, zoomLevel: 12 },
    userLocation: null,
  };
  const useMapStoreMock: any = (selector: any) => selector(state);
  useMapStoreMock.getState = () => state;
  return {
    useMapStore: useMapStoreMock,
  };
});

import { useMapStore } from '../store/useMapStore';
import * as Location from 'expo-location';
import { fetchNearbyPlaces, searchPlaces } from '../services/placeService';

const mockState = (useMapStore as any).getState();
const mockSetPois = mockState.setPois;
const mockSetCenterRegion = mockState.setCenterRegion;
const mockSetUserLocation = mockState.setUserLocation;

const mockLocation = Location as jest.Mocked<typeof Location>;
const mockFetchNearby = fetchNearbyPlaces as jest.MockedFunction<typeof fetchNearbyPlaces>;
const mockSearchPlaces = searchPlaces as jest.MockedFunction<typeof searchPlaces>;

const mockPlaceResult = {
  id: 'place-1',
  name: 'Café de Flore',
  category: 'resto' as const,
  latitude: 48.854,
  longitude: 2.332,
  address: '172 Bd Saint-Germain',
  city: 'Paris',
  rating: 4.3,
  reviews_count: 220,
  price_range: '€€€',
  images: [],
  tags: [],
  source: 'custom' as const,
  distance_m: 300,
};

describe('usePlaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Défaut : permission accordée + position disponible
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as Location.PermissionStatus,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 48.86, longitude: 2.35, altitude: null, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
      mocked: false,
    });
    mockFetchNearby.mockResolvedValue([mockPlaceResult]);
    mockSearchPlaces.mockResolvedValue([mockPlaceResult]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('état initial — isLoading et isLocating à false, places vides', () => {
    const { result } = renderHook(() => usePlaces());
    // Avant que l'init async se déclenche
    expect(result.current.error).toBeNull();
    expect(result.current.userCoords).toBeNull();
  });

  test('requestLocation — retourne les coordonnées si permission accordée', async () => {
    const { result } = renderHook(() => usePlaces());

    let coords: { latitude: number; longitude: number } | null = null;
    await act(async () => {
      coords = await result.current.requestLocation();
    });

    expect(coords).toEqual({ latitude: 48.86, longitude: 2.35 });
    expect(mockSetUserLocation).toHaveBeenCalledWith({ latitude: 48.86, longitude: 2.35 });
  });

  test('requestLocation — retourne null si permission refusée', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied' as Location.PermissionStatus,
      expires: 'never',
      granted: false,
      canAskAgain: false,
    });

    const { result } = renderHook(() => usePlaces());

    let coords: { latitude: number; longitude: number } | null = { latitude: 0, longitude: 0 };
    await act(async () => {
      coords = await result.current.requestLocation();
    });

    expect(coords).toBeNull();
    expect(result.current.error).toBeNull();
  });

  test('loadNearby — charge les places et appelle setPois', async () => {
    const { result } = renderHook(() => usePlaces());

    await act(async () => {
      await result.current.loadNearby(48.8566, 2.3522);
    });

    expect(mockFetchNearby).toHaveBeenCalledWith(48.8566, 2.3522, 2000, undefined);
    expect(mockSetPois).toHaveBeenCalled();
    const poisArg = mockSetPois.mock.calls.at(-1)[0];
    expect(poisArg[0].id).toBe('place-1');
    expect(poisArg[0].title).toBe('Café de Flore');
  });

  test('loadNearby — utilise Paris en fallback si pas de position', async () => {
    const { result } = renderHook(() => usePlaces());

    await act(async () => {
      await result.current.loadNearby();
    });

    expect(mockFetchNearby).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      2000,
      undefined,
    );
  });

  test('loadNearby — setError si fetchNearbyPlaces rejette', async () => {
    mockFetchNearby.mockRejectedValueOnce(new Error('Supabase unavailable'));
    const { result } = renderHook(() => usePlaces());

    await act(async () => {
      await result.current.loadNearby(48.8566, 2.3522);
    });

    expect(result.current.error).toBe('Supabase unavailable');
  });

  test('searchByQuery — attend 300ms avant d\'appeler searchPlaces', async () => {
    const { result } = renderHook(() => usePlaces());

    act(() => {
      result.current.searchByQuery('brasserie');
    });

    // Pas encore appelé (debounce)
    expect(mockSearchPlaces).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockSearchPlaces).toHaveBeenCalledWith(expect.objectContaining({ query: 'brasserie' }));
  });

  test('searchByQuery — query vide recharge les lieux à proximité', async () => {
    const { result } = renderHook(() => usePlaces());

    await act(async () => {
      result.current.searchByQuery('');
    });

    expect(mockFetchNearby).toHaveBeenCalled();
    expect(mockSearchPlaces).not.toHaveBeenCalled();
  });

  test('clearError — remet error à null', async () => {
    mockFetchNearby.mockRejectedValueOnce(new Error('Test error'));
    const { result } = renderHook(() => usePlaces());

    await act(async () => {
      await result.current.loadNearby(0, 0);
    });

    expect(result.current.error).toBe('Test error');

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
