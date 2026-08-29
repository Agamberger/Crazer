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
    const titleElement = getByText('Bowling du vendredi');
    expect(titleElement).toBeTruthy();
    expect(titleElement.props.numberOfLines).toBe(1);
    expect(titleElement.props.ellipsizeMode).toBe('tail');
    expect(getByText('📅 Planifiée')).toBeTruthy();
    expect(getByText('Petite partie de bowling entre amis')).toBeTruthy();
  });

  it('truncates very long titles with ellipsis', () => {
    const longOuting: OutingRow = {
      ...mockOuting,
      title: 'Titre extrêmement long pour tester le comportement du composant OutingCard et éviter le décalage du badge',
    };
    const { getByText } = render(<OutingCard outing={longOuting} />);
    const titleElement = getByText(longOuting.title);
    expect(titleElement.props.numberOfLines).toBe(1);
    expect(titleElement.props.ellipsizeMode).toBe('tail');
  });
});
