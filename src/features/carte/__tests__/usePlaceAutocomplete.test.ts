import { act, renderHook } from '@testing-library/react-native';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import * as googlePlacesService from '../services/googlePlacesService';
import * as googlePlacesRepository from '../services/googlePlaces/googlePlacesRepository';
import {
  GooglePlaceDetails,
  GooglePlacePrediction,
  GooglePlacesError,
} from '../services/googlePlaces';
import { useMapStore } from '../store/useMapStore';

jest.mock('../services/googlePlacesService');
jest.mock('../services/googlePlaces/googlePlacesRepository');

const mockToken = googlePlacesService as jest.Mocked<typeof googlePlacesService>;
const mockGoogle = googlePlacesRepository as jest.Mocked<typeof googlePlacesRepository>;

const prediction: GooglePlacePrediction = {
  placeId: 'gp-1',
  description: 'Tour Eiffel, Paris',
  mainText: 'Tour Eiffel',
  secondaryText: 'Paris',
  types: [],
};

const details: GooglePlaceDetails = {
  tier: 'details',
  placeId: 'gp-1',
  name: 'Tour Eiffel',
  latitude: 48.858,
  longitude: 2.294,
  types: [],
  photos: [],
};

describe('usePlaceAutocomplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useMapStore.setState({ searchQuery: '' });
    mockToken.createPlacesSessionToken.mockReturnValue('tok-1');
    mockGoogle.searchGooglePlacePredictions.mockResolvedValue([prediction]);
    mockGoogle.getGooglePlaceDetails.mockResolvedValue(details);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces the autocomplete request and shows the predictions', async () => {
    const { result } = renderHook(() => usePlaceAutocomplete(jest.fn()));

    act(() => result.current.handleChangeText('Tour'));
    expect(useMapStore.getState().searchQuery).toBe('Tour');
    expect(mockGoogle.searchGooglePlacePredictions).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    expect(mockGoogle.searchGooglePlacePredictions).toHaveBeenCalledWith('Tour', 'tok-1');
    expect(result.current.predictions).toEqual([prediction]);
    expect(result.current.isDropdownVisible).toBe(true);
    expect(result.current.isSearchingGoogle).toBe(false);
  });

  it('does not search below two characters', async () => {
    const { result } = renderHook(() => usePlaceAutocomplete(jest.fn()));

    act(() => result.current.handleChangeText('T'));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockGoogle.searchGooglePlacePredictions).not.toHaveBeenCalled();
    expect(result.current.isDropdownVisible).toBe(false);
  });

  it('fetches the details of the selected prediction with the same session token', async () => {
    const onPlaceDetails = jest.fn();
    const { result } = renderHook(() => usePlaceAutocomplete(onPlaceDetails));

    act(() => result.current.handleChangeText('Tour'));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    await act(async () => {
      await result.current.handleSelectPrediction(prediction);
    });

    expect(useMapStore.getState().searchQuery).toBe('Tour Eiffel');
    expect(mockGoogle.getGooglePlaceDetails).toHaveBeenCalledWith('gp-1', 'tok-1');
    expect(onPlaceDetails).toHaveBeenCalledWith(details);
    expect(result.current.isDropdownVisible).toBe(false);
    expect(result.current.isSearchingGoogle).toBe(false);
  });

  it('hides the predictions on clear', async () => {
    const { result } = renderHook(() => usePlaceAutocomplete(jest.fn()));

    act(() => result.current.handleChangeText('Tour'));
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    act(() => result.current.handleClear());

    expect(result.current.predictions).toEqual([]);
    expect(result.current.isDropdownVisible).toBe(false);
  });

  it('exposes a French message when the details request fails', async () => {
    mockGoogle.getGooglePlaceDetails.mockRejectedValueOnce(new GooglePlacesError('network'));
    const onPlaceDetails = jest.fn();
    const { result } = renderHook(() => usePlaceAutocomplete(onPlaceDetails));

    await act(async () => {
      await result.current.handleSelectPrediction(prediction);
    });

    expect(onPlaceDetails).not.toHaveBeenCalled();
    expect(result.current.searchError).toMatch(/connexion à Google/);
    expect(result.current.isSearchingGoogle).toBe(false);
  });
});
