import { act, renderHook } from '@testing-library/react-native';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import * as googlePlacesService from '../services/googlePlacesService';
import { useMapStore } from '../store/useMapStore';

jest.mock('../services/googlePlacesService');

const mockGoogle = googlePlacesService as jest.Mocked<typeof googlePlacesService>;

const prediction: googlePlacesService.GoogleAutocompletePrediction = {
  place_id: 'gp-1',
  description: 'Tour Eiffel, Paris',
  structured_formatting: { main_text: 'Tour Eiffel', secondary_text: 'Paris' },
};

const details: googlePlacesService.GooglePlaceDetailsResult = {
  place_id: 'gp-1',
  name: 'Tour Eiffel',
  geometry: { location: { lat: 48.858, lng: 2.294 } },
};

describe('usePlaceAutocomplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useMapStore.setState({ searchQuery: '' });
    mockGoogle.createPlacesSessionToken.mockReturnValue('tok-1');
    mockGoogle.fetchGooglePlaceAutocomplete.mockResolvedValue([prediction]);
    mockGoogle.fetchGooglePlaceDetails.mockResolvedValue(details);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces the autocomplete request and shows the predictions', async () => {
    const { result } = renderHook(() => usePlaceAutocomplete(jest.fn()));

    act(() => result.current.handleChangeText('Tour'));
    expect(useMapStore.getState().searchQuery).toBe('Tour');
    expect(mockGoogle.fetchGooglePlaceAutocomplete).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    expect(mockGoogle.fetchGooglePlaceAutocomplete).toHaveBeenCalledWith('Tour', 'tok-1');
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

    expect(mockGoogle.fetchGooglePlaceAutocomplete).not.toHaveBeenCalled();
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
    expect(mockGoogle.fetchGooglePlaceDetails).toHaveBeenCalledWith('gp-1', 'tok-1');
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
});
