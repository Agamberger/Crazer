import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { PlaceNameLabel } from '../components/PlaceNameLabel';
import * as repository from '../services/googlePlaces/googlePlacesRepository';
import { GooglePlacesError } from '../services/googlePlaces';

jest.mock('../services/googlePlaces/googlePlacesRepository');

const mockRepository = repository as jest.Mocked<typeof repository>;

const textOf = (testID: string): string => {
  const children: unknown = screen.getByTestId(testID).props.children;
  const parts = Array.isArray(children) ? children : [children];
  return parts.filter((part): part is string => typeof part === 'string').join('');
};

describe('PlaceNameLabel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows a stored Crazer place without calling Google', () => {
    render(
      <PlaceNameLabel
        place={{ name: 'Le Burger Gourmet', address: '15 rue de la Paix', googlePlaceId: null }}
        showAddress
        testID="label"
      />,
    );

    expect(textOf('label')).toContain('Le Burger Gourmet · 15 rue de la Paix');
    expect(screen.queryByTestId('label-attribution')).toBeNull();
    expect(mockRepository.getGooglePlaceSummary).not.toHaveBeenCalled();
  });

  it('resolves a Google place live and credits Google Maps', async () => {
    mockRepository.getGooglePlaceSummary.mockResolvedValue({
      tier: 'summary',
      placeId: 'ChIJ1',
      name: 'Tour Eiffel',
      address: 'Champ de Mars, Paris',
      latitude: 48.85,
      longitude: 2.29,
      types: [],
    });

    render(
      <PlaceNameLabel
        place={{ name: null, address: null, googlePlaceId: 'ChIJ1' }}
        showAddress
        testID="label"
      />,
    );

    expect(textOf('label')).toContain('Chargement du lieu');
    await waitFor(() => expect(textOf('label')).toContain('Tour Eiffel · Champ de Mars, Paris'));
    expect(screen.getByTestId('label-attribution')).toBeTruthy();
    expect(mockRepository.getGooglePlaceSummary).toHaveBeenCalledWith('ChIJ1');
  });

  it('says the place is unavailable when Google fails', async () => {
    mockRepository.getGooglePlaceSummary.mockRejectedValue(new GooglePlacesError('quota_exceeded'));

    render(
      <PlaceNameLabel
        place={{ name: null, address: null, googlePlaceId: 'ChIJ1' }}
        testID="label"
      />,
    );

    await waitFor(() => expect(textOf('label')).toContain('Lieu indisponible'));
    expect(screen.queryByTestId('label-attribution')).toBeNull();
  });
});
