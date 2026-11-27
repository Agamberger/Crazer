import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { MapHeaderSearch } from '../components/MapHeaderSearch';
import * as googlePlacesService from '../services/googlePlacesService';
import * as googlePlacesRepository from '../services/googlePlaces/googlePlacesRepository';
import { GooglePlacesError } from '../services/googlePlaces';

jest.mock('../services/googlePlacesService');
jest.mock('../services/googlePlaces/googlePlacesRepository');

const mockGoogleService = googlePlacesService as jest.Mocked<typeof googlePlacesService>;
const mockRepository = googlePlacesRepository as jest.Mocked<typeof googlePlacesRepository>;

const eiffelPrediction = {
  placeId: 'place_1',
  description: 'Tour Eiffel, Paris',
  mainText: 'Tour Eiffel',
  secondaryText: 'Paris, France',
  types: [],
};

describe('MapHeaderSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoogleService.createPlacesSessionToken.mockReturnValue('session-tok');
  });

  test('rend la barre de recherche et les catégories', () => {
    const { getByPlaceholderText, getByText } = render(<MapHeaderSearch />);

    expect(getByPlaceholderText(/Rechercher un lieu/i)).toBeTruthy();
    expect(getByText('Tous')).toBeTruthy();
    expect(getByText('Restos')).toBeTruthy();
    expect(getByText('Bars')).toBeTruthy();
  });

  test("affiche les suggestions d'autocomplétion après saisie", async () => {
    mockRepository.searchGooglePlacePredictions.mockResolvedValueOnce([eiffelPrediction]);

    const { getByPlaceholderText, findByText } = render(<MapHeaderSearch />);

    const input = getByPlaceholderText(/Rechercher un lieu/i);

    fireEvent.changeText(input, 'Tour');

    const suggestion = await findByText('Tour Eiffel');
    expect(suggestion).toBeTruthy();
  });

  test('masque la liste des prédictions et déclenche les détails au clic sur une suggestion', async () => {
    const mockOnSelectGooglePlace = jest.fn();

    mockRepository.searchGooglePlacePredictions.mockResolvedValueOnce([eiffelPrediction]);

    mockRepository.getGooglePlaceDetails.mockResolvedValueOnce({
      tier: 'details',
      placeId: 'place_1',
      name: 'Tour Eiffel',
      latitude: 48.8584,
      longitude: 2.2945,
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      types: ['tourist_attraction'],
      rating: 4.7,
      photos: [],
    });

    const { getByPlaceholderText, findByText, queryByTestId } = render(
      <MapHeaderSearch onSelectGooglePlace={mockOnSelectGooglePlace} />,
    );

    const input = getByPlaceholderText(/Rechercher un lieu/i);
    fireEvent.changeText(input, 'Tour');

    const suggestion = await findByText('Tour Eiffel');

    await act(async () => {
      fireEvent.press(suggestion);
    });

    await waitFor(() => {
      // Même jeton de session pour l'autocomplétion et le détail (facturation groupée)
      expect(mockRepository.searchGooglePlacePredictions).toHaveBeenCalledWith(
        expect.any(String),
        'session-tok',
      );
      expect(mockRepository.getGooglePlaceDetails).toHaveBeenCalledWith('place_1', 'session-tok');
      expect(mockOnSelectGooglePlace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'google-place_1',
          title: 'Tour Eiffel',
        }),
      );
      // La liste d'autocomplétion doit être fermée
      expect(queryByTestId('autocomplete-dropdown')).toBeNull();
    });
  });
  test('démarre une nouvelle session Google quand la recherche est effacée puis reprise', async () => {
    mockGoogleService.createPlacesSessionToken
      .mockReturnValueOnce('session-1')
      .mockReturnValueOnce('session-2');
    mockRepository.searchGooglePlacePredictions.mockResolvedValue([]);

    const { getByPlaceholderText } = render(<MapHeaderSearch />);
    const input = getByPlaceholderText(/Rechercher un lieu/i);

    fireEvent.changeText(input, 'Tour');
    await waitFor(() =>
      expect(mockRepository.searchGooglePlacePredictions).toHaveBeenLastCalledWith(
        'Tour',
        'session-1',
      ),
    );

    // Recherche abandonnée (champ vidé) puis nouvelle recherche
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, 'Bar');
    await waitFor(() =>
      expect(mockRepository.searchGooglePlacePredictions).toHaveBeenLastCalledWith(
        'Bar',
        'session-2',
      ),
    );
  });

  test('affiche un message quand Google refuse la recherche (quota dépassé)', async () => {
    mockRepository.searchGooglePlacePredictions.mockRejectedValueOnce(
      new GooglePlacesError('quota_exceeded'),
    );

    const { getByPlaceholderText, findByTestId } = render(<MapHeaderSearch />);
    fireEvent.changeText(getByPlaceholderText(/Rechercher un lieu/i), 'Tour');

    const error = await findByTestId('map-search-error');
    expect(error.props.children).toMatch(/momentanément indisponibles/);
  });
});
