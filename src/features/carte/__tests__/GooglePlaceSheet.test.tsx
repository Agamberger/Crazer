import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GooglePlaceSheet } from '../components/GooglePlaceSheet';
import * as repository from '../services/googlePlaces/googlePlacesRepository';
import { GooglePlaceDetails, GooglePlacesError } from '../services/googlePlaces';

jest.mock('../services/googlePlaces/googlePlacesRepository');

const mockRepository = repository as jest.Mocked<typeof repository>;

const details: GooglePlaceDetails = {
  tier: 'details',
  placeId: 'ChIJ1',
  name: 'Tour Eiffel',
  address: 'Champ de Mars, Paris',
  latitude: 48.85,
  longitude: 2.29,
  types: ['tourist_attraction'],
  googleMapsUri: 'https://maps.google.com/?cid=1',
  rating: 4.7,
  userRatingCount: 1000,
  weekdayHours: ['lundi: 09:00 – 23:00'],
  isOpenNow: true,
  photos: [{ name: 'places/ChIJ1/photos/A', authorAttributions: [{ displayName: 'Jo' }] }],
};

const renderSheet = (overrides: Partial<React.ComponentProps<typeof GooglePlaceSheet>> = {}) => {
  const props: React.ComponentProps<typeof GooglePlaceSheet> = {
    googlePlaceId: 'ChIJ1',
    placeItemId: 'google-ChIJ1',
    onClose: jest.fn(),
    onAddToOuting: jest.fn(),
    onGetDirections: jest.fn(),
    isTargetMode: false,
    ...overrides,
  };
  render(<GooglePlaceSheet {...props} />);
  return props;
};

describe('GooglePlaceSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'test_key';
  });

  it('shows the live details with photo credits and the Google Maps attribution', async () => {
    mockRepository.getGooglePlaceDetails.mockResolvedValue(details);
    renderSheet();

    expect(screen.getByTestId('google-place-loading')).toBeTruthy();
    expect(await screen.findByText('Tour Eiffel')).toBeTruthy();
    expect(screen.getByTestId('google-place-rating')).toBeTruthy();
    expect(screen.getByText('Ouvert maintenant')).toBeTruthy();
    expect(screen.getByTestId('place-other-photo-0-credit')).toBeTruthy();
    expect(screen.getByTestId('google-attribution')).toBeTruthy();
    expect(screen.getByTestId('google-attribution-link')).toBeTruthy();
    expect(mockRepository.getGooglePlaceDetails).toHaveBeenCalledWith('ChIJ1');
  });

  it('gives the actions a place item keeping the selected id', async () => {
    mockRepository.getGooglePlaceDetails.mockResolvedValue(details);
    const props = renderSheet();

    fireEvent.press(await screen.findByLabelText('Ajouter ce lieu à une sortie'));

    expect(props.onAddToOuting).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'google-ChIJ1', googlePlaceId: 'ChIJ1', title: 'Tour Eiffel' }),
    );
  });

  it('explains when Google is unavailable', async () => {
    mockRepository.getGooglePlaceDetails.mockRejectedValue(new GooglePlacesError('quota_exceeded'));
    renderSheet();

    await waitFor(() => expect(screen.getByTestId('google-place-error')).toBeTruthy());
    expect(screen.getByText(/momentanément indisponibles/)).toBeTruthy();
  });

  it('is hidden and calls nothing without a place', () => {
    renderSheet({ googlePlaceId: null });
    expect(screen.queryByTestId('google-place-loading')).toBeNull();
    expect(mockRepository.getGooglePlaceDetails).not.toHaveBeenCalled();
  });
});
