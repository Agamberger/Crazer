import React from 'react';
import { render } from '@testing-library/react-native';
import { PlaceCommunityHours } from '../components/PlaceCommunityHours';
import { PlaceItem } from '../types/carte';

const mockSection = jest.fn();

jest.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'alice' } }) }));
jest.mock('../services/placeService', () => ({ ensurePlaceExists: jest.fn() }));
jest.mock('../hooks/useSavedPlaceId', () => ({ useSavedPlaceId: () => 'saved-id' }));
jest.mock('@/features/place-contributions', () => ({
  PlaceHoursSection: (props: Record<string, unknown>) => {
    mockSection(props);
    return null;
  },
}));

const place: PlaceItem = {
  id: 'google-ChIJ1',
  googlePlaceId: 'ChIJ1',
  title: 'Tour Eiffel',
  category: 'culture',
  latitude: 1,
  longitude: 2,
  address: 'x',
  rating: 0,
  reviewsCount: 0,
  openingHours: ['lundi: 09:00 – 18:00'],
  isOpenNow: true,
};

describe('PlaceCommunityHours', () => {
  beforeEach(() => jest.clearAllMocks());

  it('gives Google hours as the fallback of a Google place, labelled Google Maps', () => {
    render(<PlaceCommunityHours place={place} />);
    expect(mockSection).toHaveBeenLastCalledWith(
      expect.objectContaining({
        placeId: 'saved-id',
        fallbackHours: ['lundi: 09:00 – 18:00'],
        fallbackOpenNow: true,
        fallbackSourceLabel: 'Google Maps',
      }),
    );
  });

  it('gives no source label to the stored hours of a Crazer place', () => {
    render(<PlaceCommunityHours place={{ ...place, id: 'uuid', googlePlaceId: undefined }} />);
    expect(mockSection).toHaveBeenLastCalledWith(
      expect.objectContaining({ fallbackSourceLabel: undefined }),
    );
  });
});
