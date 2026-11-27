import { renderHook, waitFor } from '@testing-library/react-native';
import { useGooglePlaceDetails, useGooglePlaceSummaries } from '../hooks/useGooglePlaces';
import * as repository from '../services/googlePlaces/googlePlacesRepository';
import { GooglePlaceDetails, GooglePlacesError, GooglePlaceSummary } from '../services/googlePlaces';

jest.mock('../services/googlePlaces/googlePlacesRepository');

const mockRepository = repository as jest.Mocked<typeof repository>;

const summaryOf = (placeId: string): GooglePlaceSummary => ({
  tier: 'summary',
  placeId,
  name: `Lieu ${placeId}`,
  latitude: 1,
  longitude: 2,
  types: [],
});

describe('useGooglePlaceSummaries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads each distinct id once and reports loading, ready and unavailable', async () => {
    mockRepository.getGooglePlaceSummary.mockImplementation((placeId) =>
      placeId === 'gone'
        ? Promise.reject(new GooglePlacesError('not_found'))
        : Promise.resolve(summaryOf(placeId)),
    );

    const { result } = renderHook(() => useGooglePlaceSummaries(['a', null, 'gone', 'a']));

    expect(result.current).toEqual({ a: { status: 'loading' }, gone: { status: 'loading' } });
    await waitFor(() => expect(result.current.a.status).toBe('ready'));
    await waitFor(() =>
      expect(result.current.gone).toEqual({ status: 'unavailable', reason: 'not_found' }),
    );
    expect(mockRepository.getGooglePlaceSummary).toHaveBeenCalledTimes(2);
  });

  it('returns an empty record without ids', () => {
    const { result } = renderHook(() => useGooglePlaceSummaries([]));
    expect(result.current).toEqual({});
    expect(mockRepository.getGooglePlaceSummary).not.toHaveBeenCalled();
  });
});

describe('useGooglePlaceDetails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null without a place id', () => {
    const { result } = renderHook(() => useGooglePlaceDetails(null));
    expect(result.current).toBeNull();
    expect(mockRepository.getGooglePlaceDetails).not.toHaveBeenCalled();
  });

  it('loads the details of the place', async () => {
    const details: GooglePlaceDetails = { ...summaryOf('a'), tier: 'details', photos: [] };
    mockRepository.getGooglePlaceDetails.mockResolvedValue(details);

    const { result } = renderHook(() => useGooglePlaceDetails('a'));

    expect(result.current).toEqual({ status: 'loading' });
    await waitFor(() => expect(result.current).toEqual({ status: 'ready', place: details }));
  });

  it('reports a quota error as unavailable', async () => {
    mockRepository.getGooglePlaceDetails.mockRejectedValue(new GooglePlacesError('quota_exceeded'));

    const { result } = renderHook(() => useGooglePlaceDetails('a'));

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'unavailable', reason: 'quota_exceeded' }),
    );
  });
});
