import * as client from '../services/googlePlaces/googlePlacesClient';
import {
  clearGooglePlacesCache,
  getGooglePlaceDetails,
  getGooglePlaceSummary,
  searchGooglePlacePredictions,
} from '../services/googlePlaces/googlePlacesRepository';
import {
  GooglePlaceDetails,
  GooglePlacesError,
  GooglePlaceSummary,
} from '../services/googlePlaces';
import { resetUserScopedStores } from '@/shared/store/sessionReset';

jest.mock('../services/googlePlaces/googlePlacesClient');

const mockClient = client as jest.Mocked<typeof client>;

const summary: GooglePlaceSummary = {
  tier: 'summary',
  placeId: 'ChIJ1',
  name: 'Le Comptoir',
  latitude: 48.85,
  longitude: 2.35,
  types: [],
};
const details: GooglePlaceDetails = { ...summary, tier: 'details', rating: 4.5, photos: [] };

describe('googlePlacesRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearGooglePlacesCache();
  });

  it('serves a second summary request from the session cache', async () => {
    mockClient.requestPlace.mockResolvedValue(summary);

    await getGooglePlaceSummary('ChIJ1');
    await expect(getGooglePlaceSummary('ChIJ1')).resolves.toEqual(summary);

    expect(mockClient.requestPlace).toHaveBeenCalledTimes(1);
  });

  it('merges concurrent requests for the same place', async () => {
    mockClient.requestPlace.mockResolvedValue(summary);

    await Promise.all([getGooglePlaceSummary('ChIJ1'), getGooglePlaceSummary('ChIJ1')]);

    expect(mockClient.requestPlace).toHaveBeenCalledTimes(1);
  });

  it('uses cached details for a summary but not a summary for details', async () => {
    mockClient.requestPlace.mockResolvedValueOnce(summary).mockResolvedValueOnce(details);

    await getGooglePlaceSummary('ChIJ1');
    await expect(getGooglePlaceDetails('ChIJ1')).resolves.toEqual(details);
    await expect(getGooglePlaceSummary('ChIJ1')).resolves.toEqual(details);

    expect(mockClient.requestPlace).toHaveBeenCalledTimes(2);
    expect(mockClient.requestPlace).toHaveBeenLastCalledWith('ChIJ1', 'details', undefined);
  });

  it('remembers a place that no longer exists', async () => {
    mockClient.requestPlace.mockRejectedValue(new GooglePlacesError('not_found'));

    await expect(getGooglePlaceSummary('gone')).rejects.toMatchObject({ kind: 'not_found' });
    await expect(getGooglePlaceSummary('gone')).rejects.toMatchObject({ kind: 'not_found' });

    expect(mockClient.requestPlace).toHaveBeenCalledTimes(1);
  });

  it('stops calling Google after a quota error', async () => {
    mockClient.requestPlace.mockRejectedValueOnce(new GooglePlacesError('quota_exceeded'));

    await expect(getGooglePlaceSummary('ChIJ1')).rejects.toMatchObject({ kind: 'quota_exceeded' });
    await expect(getGooglePlaceSummary('ChIJ2')).rejects.toMatchObject({ kind: 'quota_exceeded' });
    await expect(searchGooglePlacePredictions('Café')).rejects.toMatchObject({
      kind: 'quota_exceeded',
    });

    expect(mockClient.requestPlace).toHaveBeenCalledTimes(1);
    expect(mockClient.requestAutocomplete).not.toHaveBeenCalled();
  });

  it('does not cache a network error', async () => {
    mockClient.requestPlace
      .mockRejectedValueOnce(new GooglePlacesError('network'))
      .mockResolvedValueOnce(summary);

    await expect(getGooglePlaceSummary('ChIJ1')).rejects.toMatchObject({ kind: 'network' });
    await expect(getGooglePlaceSummary('ChIJ1')).resolves.toEqual(summary);
  });

  it('caches predictions per text and skips too short inputs', async () => {
    mockClient.requestAutocomplete.mockResolvedValue([]);

    await expect(searchGooglePlacePredictions(' a ')).resolves.toEqual([]);
    await searchGooglePlacePredictions('Café', 'tok');
    await searchGooglePlacePredictions(' café ', 'tok');

    expect(mockClient.requestAutocomplete).toHaveBeenCalledTimes(1);
    expect(mockClient.requestAutocomplete).toHaveBeenCalledWith('Café', 'tok');
  });

  it('is emptied at logout', async () => {
    mockClient.requestPlace.mockResolvedValue(summary);

    await getGooglePlaceSummary('ChIJ1');
    resetUserScopedStores();
    await getGooglePlaceSummary('ChIJ1');

    expect(mockClient.requestPlace).toHaveBeenCalledTimes(2);
  });
});
