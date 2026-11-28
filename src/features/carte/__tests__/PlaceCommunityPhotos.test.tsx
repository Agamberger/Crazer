import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { PlaceCommunityPhotos } from '../components/PlaceCommunityPhotos';
import { PlaceItem } from '../types/carte';
import { ensurePlaceExists } from '../services/placeService';

const mockSection = jest.fn();
const mockFindPlaceId = jest.fn();

jest.mock('@/features/auth', () => ({ useAuth: () => ({ user: { id: 'alice' } }) }));
jest.mock('../services/placeService', () => ({ ensurePlaceExists: jest.fn() }));
jest.mock('@/features/place-contributions', () => ({
  PlacePhotosSection: (props: Record<string, unknown>) => {
    mockSection(props);
    return null;
  },
  placeContributionsService: {
    findPlaceIdByGooglePlaceId: (...args: unknown[]) => mockFindPlaceId(...args),
  },
}));

const crazerPlace: PlaceItem = {
  id: 'b1111111-1111-1111-1111-111111111111',
  title: 'Le Burger Gourmet',
  category: 'resto',
  latitude: 1,
  longitude: 2,
  address: 'x',
  rating: 0,
  reviewsCount: 0,
};

const lastSectionProps = (): Record<string, unknown> =>
  mockSection.mock.calls[mockSection.mock.calls.length - 1][0] as Record<string, unknown>;

describe('PlaceCommunityPhotos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uses the id of a saved Crazer place', () => {
    render(<PlaceCommunityPhotos place={crazerPlace} />);
    expect(lastSectionProps().placeId).toBe(crazerPlace.id);
    expect(mockFindPlaceId).not.toHaveBeenCalled();
  });

  it('finds the row already saved for a Google place', async () => {
    mockFindPlaceId.mockResolvedValue('google-row');
    render(
      <PlaceCommunityPhotos
        place={{ ...crazerPlace, id: 'google-ChIJ1', googlePlaceId: 'ChIJ1' }}
      />,
    );

    expect(lastSectionProps().placeId).toBeNull();
    await waitFor(() => expect(lastSectionProps().placeId).toBe('google-row'));
    expect(mockFindPlaceId).toHaveBeenCalledWith('ChIJ1');
  });

  it('saves the place through ensurePlaceExists on the first upload', async () => {
    (ensurePlaceExists as jest.Mock).mockResolvedValue('new-id');
    render(<PlaceCommunityPhotos place={{ ...crazerPlace, id: 'osm-12' }} />);

    const resolvePlaceId = lastSectionProps().resolvePlaceId as () => Promise<string>;
    await expect(resolvePlaceId()).resolves.toBe('new-id');
    expect(ensurePlaceExists).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'osm-12' }),
      'alice',
    );
  });

  it('passes the place photos and their credits to the merged strip', () => {
    render(
      <PlaceCommunityPhotos
        place={{ ...crazerPlace, images: ['https://g/1', 'https://g/2'], imageCredits: ['Jo'] }}
      />,
    );
    expect(lastSectionProps().otherPhotos).toEqual([
      { url: 'https://g/1', credit: 'Jo' },
      { url: 'https://g/2', credit: undefined },
    ]);
  });
});
