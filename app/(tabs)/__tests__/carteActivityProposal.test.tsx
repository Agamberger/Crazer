import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import CarteScreen from '../carte';
import { PlaceItem, useMapStore } from '@/features/carte';
import { ensurePlaceExists } from '@/features/carte/services/placeService';
import {
  useActivityVotesStore,
  useOutingSchedulingStore,
  useOutingsStore,
} from '@/features/outings';
import { activityVotesService } from '@/features/outings/services/activityVotesService';
import { outingSchedulingService } from '@/features/outings/services/outingSchedulingService';
import { OutingRow } from '@/shared/types';

jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'alice' } }),
}));
jest.mock('@/features/carte/services/placeService', () => ({
  ...jest.requireActual('@/features/carte/services/placeService'),
  ensurePlaceExists: jest.fn(),
}));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('@/features/outings/services/activityVotesService', () => ({
  activityVotesService: {
    fetchActivities: jest.fn(),
    fetchVotes: jest.fn(),
    proposeActivity: jest.fn(),
    subscribeToActivities: jest.fn(),
  },
}));
jest.mock('@/features/outings/services/outingSchedulingService', () => ({
  outingSchedulingService: {
    fetchOutingDays: jest.fn(),
    fetchAvailabilities: jest.fn(),
    fetchMembers: jest.fn(),
  },
}));

const votes = activityVotesService as jest.Mocked<typeof activityVotesService>;
const scheduling = outingSchedulingService as jest.Mocked<typeof outingSchedulingService>;

const OUTING: OutingRow = {
  id: 'o1',
  title: 'Samedi entre potes',
  description: null,
  start_date: null,
  created_by: 'alice',
  status: 'draft',
  cover_image: null,
  outing_type: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
};

const PLACE: PlaceItem = {
  id: 'osm-1',
  title: 'Bowling Strike',
  category: 'activite',
  latitude: 48.85,
  longitude: 2.35,
  address: '1 rue de Paris',
  rating: 4.5,
  reviewsCount: 10,
};

describe('CarteScreen — « Chercher sur la carte » (proposer une activité)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOutingsStore.setState({ outings: [OUTING], fetchOutingById: jest.fn() });
    useActivityVotesStore.setState(useActivityVotesStore.getInitialState(), true);
    useOutingSchedulingStore.setState(useOutingSchedulingStore.getInitialState(), true);
    useMapStore.setState({
      places: [PLACE],
      selectedPlaceId: PLACE.id,
      targetOutingId: 'o1',
      targetKind: 'activity',
    });
    votes.fetchActivities.mockResolvedValue([]);
    votes.fetchVotes.mockResolvedValue([]);
    votes.subscribeToActivities.mockReturnValue(jest.fn());
    scheduling.fetchOutingDays.mockResolvedValue([]);
    scheduling.fetchAvailabilities.mockResolvedValue([]);
    scheduling.fetchMembers.mockResolvedValue([
      {
        userId: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        status: 'accepted',
        isOrganizer: true,
      },
    ]);
  });

  it('propose le lieu choisi comme activité puis revient au hub', async () => {
    (ensurePlaceExists as jest.Mock).mockResolvedValue('place-uuid-1');
    votes.proposeActivity.mockResolvedValue({
      id: 'a1',
      outingId: 'o1',
      title: 'Bowling Strike',
      note: null,
      proposedBy: 'alice',
      place: null,
      createdAt: '2026-11-01T00:00:00Z',
    });
    const { getByTestId, getByText, findByTestId } = render(<CarteScreen />);

    expect(getByText('💡 Proposer une activité pour')).toBeTruthy();
    fireEvent.press(getByTestId('add-to-outing-button'));

    expect(await findByTestId('propose-activity-place')).toHaveTextContent('📍 Bowling Strike');
    expect(getByTestId('input-activity-title').props.value).toBe('Bowling Strike');
    fireEvent.press(getByTestId('btn-propose-activity'));

    await waitFor(() =>
      expect(votes.proposeActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          outingId: 'o1',
          title: 'Bowling Strike',
          placeId: 'place-uuid-1',
        }),
      ),
    );
    await waitFor(() =>
      expect(useRouter().navigate).toHaveBeenCalledWith({
        pathname: '/outing/[id]',
        params: { id: 'o1' },
      }),
    );
    expect(useMapStore.getState().targetOutingId).toBeNull();
  });
});
