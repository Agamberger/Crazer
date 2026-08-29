import React from 'react';
import { render } from '@testing-library/react-native';
import { PlannedOutingCard } from '../components/PlannedOutingCard';
import { PlannedOutingRow } from '@/shared/types';

describe('PlannedOutingCard Component', () => {
  const mockPlannedOuting: PlannedOutingRow = {
    id: 'po-1',
    outing_id: 'out-100',
    title: 'Apéro au Rooftop',
    description: 'Verre de bienvenue et tapas',
    notes: 'Code entrée: 1234',
    scheduled_for: '2026-08-30T19:30:00.000Z',
    duration_min: 90,
    status: 'confirmed',
    place_id: null,
    created_by: 'user-1',
    created_at: '2026-08-24T20:00:00Z',
    updated_at: '2026-08-24T20:00:00Z',
  };

  it('renders title, step badge, description, notes, and French status', () => {
    const { getByText, getByTestId } = render(
      <PlannedOutingCard plannedOuting={mockPlannedOuting} stepIndex={0} />
    );

    expect(getByText('Apéro au Rooftop')).toBeTruthy();
    expect(getByText('#1')).toBeTruthy();
    expect(getByText('Verre de bienvenue et tapas')).toBeTruthy();
    expect(getByText('💬 Code entrée: 1234')).toBeTruthy();
    expect(getByText(/Confirmée/)).toBeTruthy();
    expect(getByTestId('planned-outing-card-po-1')).toBeTruthy();
  });

  it('formats duration properly in hours and minutes', () => {
    const { getByText } = render(
      <PlannedOutingCard plannedOuting={mockPlannedOuting} />
    );

    expect(getByText('⏱️ 1h30')).toBeTruthy();
  });

  it('handles empty description and notes gracefully', () => {
    const simplePlanned: PlannedOutingRow = {
      ...mockPlannedOuting,
      description: null,
      notes: null,
      duration_min: null,
    };

    const { queryByText, getByText } = render(
      <PlannedOutingCard plannedOuting={simplePlanned} />
    );

    expect(getByText('Apéro au Rooftop')).toBeTruthy();
    expect(queryByText('💬')).toBeNull();
  });
});
