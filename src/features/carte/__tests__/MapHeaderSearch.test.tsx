import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { MapHeaderSearch } from '../components/MapHeaderSearch';
import * as googlePlacesService from '../services/googlePlacesService';

jest.mock('../services/googlePlacesService');

const mockGoogleService = googlePlacesService as jest.Mocked<typeof googlePlacesService>;

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

  test('affiche les suggestions d\'autocomplétion après saisie', async () => {
    mockGoogleService.fetchGooglePlaceAutocomplete.mockResolvedValueOnce([
      {
        place_id: 'place_1',
        description: 'Tour Eiffel, Paris',
        structured_formatting: {
          main_text: 'Tour Eiffel',
          secondary_text: 'Paris, France',
        },
      },
    ]);

    const { getByPlaceholderText, findByText } = render(<MapHeaderSearch />);

    const input = getByPlaceholderText(/Rechercher un lieu/i);

    fireEvent.changeText(input, 'Tour');

    const suggestion = await findByText('Tour Eiffel');
    expect(suggestion).toBeTruthy();
  });

  test('masque la liste des prédictions et déclenche les détails au clic sur une suggestion', async () => {
    const mockOnSelectGooglePlace = jest.fn();

    mockGoogleService.fetchGooglePlaceAutocomplete.mockResolvedValueOnce([
      {
        place_id: 'place_1',
        description: 'Tour Eiffel, Paris',
        structured_formatting: {
          main_text: 'Tour Eiffel',
          secondary_text: 'Paris, France',
        },
      },
    ]);

    mockGoogleService.fetchGooglePlaceDetails.mockResolvedValueOnce({
      place_id: 'place_1',
      name: 'Tour Eiffel',
      geometry: { location: { lat: 48.8584, lng: 2.2945 } },
      formatted_address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      types: ['tourist_attraction'],
    });

    mockGoogleService.googlePlaceDetailsToPlaceItem.mockReturnValueOnce({
      id: 'google-place_1',
      title: 'Tour Eiffel',
      category: 'culture',
      latitude: 48.8584,
      longitude: 2.2945,
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      rating: 4.7,
      reviewsCount: 150000,
      description: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris',
      priceRange: '€€',
    });

    const { getByPlaceholderText, findByText, queryByTestId } = render(
      <MapHeaderSearch onSelectGooglePlace={mockOnSelectGooglePlace} />
    );

    const input = getByPlaceholderText(/Rechercher un lieu/i);
    fireEvent.changeText(input, 'Tour');

    const suggestion = await findByText('Tour Eiffel');

    await act(async () => {
      fireEvent.press(suggestion);
    });

    await waitFor(() => {
      // Même jeton de session pour l'autocomplétion et le détail (facturation groupée)
      expect(mockGoogleService.fetchGooglePlaceAutocomplete).toHaveBeenCalledWith(
        expect.any(String),
        'session-tok',
      );
      expect(mockGoogleService.fetchGooglePlaceDetails).toHaveBeenCalledWith('place_1', 'session-tok');
      expect(mockOnSelectGooglePlace).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'google-place_1',
          title: 'Tour Eiffel',
        })
      );
      // La liste d'autocomplétion doit être fermée
      expect(queryByTestId('autocomplete-dropdown')).toBeNull();
    });
  });
  test('démarre une nouvelle session Google quand la recherche est effacée puis reprise', async () => {
    mockGoogleService.createPlacesSessionToken
      .mockReturnValueOnce('session-1')
      .mockReturnValueOnce('session-2');
    mockGoogleService.fetchGooglePlaceAutocomplete.mockResolvedValue([]);

    const { getByPlaceholderText } = render(<MapHeaderSearch />);
    const input = getByPlaceholderText(/Rechercher un lieu/i);

    fireEvent.changeText(input, 'Tour');
    await waitFor(() =>
      expect(mockGoogleService.fetchGooglePlaceAutocomplete).toHaveBeenLastCalledWith(
        'Tour',
        'session-1',
      ),
    );

    // Recherche abandonnée (champ vidé) puis nouvelle recherche
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, 'Bar');
    await waitFor(() =>
      expect(mockGoogleService.fetchGooglePlaceAutocomplete).toHaveBeenLastCalledWith(
        'Bar',
        'session-2',
      ),
    );
  });
});
