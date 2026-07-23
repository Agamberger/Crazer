import React from 'react';
import { render } from '@testing-library/react-native';
import { SortieCard } from '../components/SortieCard';
import { Sortie } from '@/shared/types';

describe('SortieCard Component', () => {
  const mockSortie: Sortie = {
    id: '1',
    title: 'Bowling du vendredi',
    description: 'Petite partie de bowling',
    isPrivate: true,
    creatorId: 'u1',
    participantIds: ['u1', 'u2'],
    status: 'planned',
    scheduledDate: '2026-08-01T20:00:00Z',
    meetingPoint: 'Gare Montparnasse',
    activityIds: ['a1'],
    createdAt: '2026-07-23T18:00:00Z',
  };

  it('renders sortie title and status correctly', () => {
    const { getByText } = render(<SortieCard sortie={mockSortie} />);
    expect(getByText('Bowling du vendredi')).toBeTruthy();
    expect(getByText('PLANNED')).toBeTruthy();
    expect(getByText('👥 2 participants')).toBeTruthy();
  });
});
