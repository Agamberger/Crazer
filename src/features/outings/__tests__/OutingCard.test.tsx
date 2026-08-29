import React from 'react';
import { render } from '@testing-library/react-native';
import { OutingCard } from '../components/OutingCard';
import { OutingRow } from '@/shared/types';

describe('OutingCard Component', () => {
  const mockOuting: OutingRow = {
    id: 'out-1',
    title: 'Bowling du vendredi',
    description: 'Petite partie de bowling entre amis',
    start_date: '2026-08-28T20:00:00Z',
    created_by: 'u1',
    status: 'planned',
    cover_image: null,
    created_at: '2026-08-24T18:00:00Z',
    updated_at: '2026-08-24T18:00:00Z',
  };

  it('renders outing title, description, and French status correctly', () => {
    const { getByText } = render(<OutingCard outing={mockOuting} />);
    expect(getByText('Bowling du vendredi')).toBeTruthy();
    expect(getByText('📅 Planifiée')).toBeTruthy();
    expect(getByText('Petite partie de bowling entre amis')).toBeTruthy();
  });
});
