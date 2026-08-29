import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PlannedOutingsTimeline } from '../components/PlannedOutingsTimeline';
import { PlannedOutingRow } from '@/shared/types';

describe('PlannedOutingsTimeline Component', () => {
  const mockPlannedOutings: PlannedOutingRow[] = [
    {
      id: 'po-2',
      outing_id: 'out-1',
      title: 'Dîner Burger',
      description: 'Repas convivial',
      notes: null,
      scheduled_for: '2026-08-30T21:00:00.000Z',
      duration_min: 90,
      status: 'pending',
      place_id: null,
      created_by: 'user-1',
      created_at: '2026-08-24T20:00:00Z',
      updated_at: '2026-08-24T20:00:00Z',
    },
    {
      id: 'po-1',
      outing_id: 'out-1',
      title: 'Apéro Bar',
      description: 'Point de rencontre',
      notes: null,
      scheduled_for: '2026-08-30T19:00:00.000Z',
      duration_min: 60,
      status: 'confirmed',
      place_id: null,
      created_by: 'user-1',
      created_at: '2026-08-24T20:00:00Z',
      updated_at: '2026-08-24T20:00:00Z',
    },
    {
      id: 'po-3',
      outing_id: 'out-1',
      title: 'Soirée Dansante',
      description: 'Fin de soirée',
      notes: null,
      scheduled_for: '2026-08-30T23:00:00.000Z',
      duration_min: 120,
      status: 'pending',
      place_id: null,
      created_by: 'user-1',
      created_at: '2026-08-24T20:00:00Z',
      updated_at: '2026-08-24T20:00:00Z',
    },
  ];

  it('renders timeline with planned outings sorted chronologically and vertical continuity connectors', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <PlannedOutingsTimeline
        plannedOutings={mockPlannedOutings}
        onAddPlannedOuting={jest.fn()}
      />
    );

    // Title and total count badge
    expect(getByText('Étapes de la sortie')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();

    // First sorted item (po-1 at 19:00): should have bottom line but NO top line
    expect(getByTestId('timeline-item-po-1')).toBeTruthy();
    expect(getByTestId('timeline-node-po-1')).toBeTruthy();
    expect(getByTestId('timeline-line-bottom-po-1')).toBeTruthy();
    expect(queryByTestId('timeline-line-top-po-1')).toBeNull();

    // Middle item (po-2 at 21:00): should have BOTH top and bottom lines
    expect(getByTestId('timeline-item-po-2')).toBeTruthy();
    expect(getByTestId('timeline-node-po-2')).toBeTruthy();
    expect(getByTestId('timeline-line-top-po-2')).toBeTruthy();
    expect(getByTestId('timeline-line-bottom-po-2')).toBeTruthy();

    // Last sorted item (po-3 at 23:00): should have top line but NO bottom line
    expect(getByTestId('timeline-item-po-3')).toBeTruthy();
    expect(getByTestId('timeline-node-po-3')).toBeTruthy();
    expect(getByTestId('timeline-line-top-po-3')).toBeTruthy();
    expect(queryByTestId('timeline-line-bottom-po-3')).toBeNull();
  });

  it('renders empty state when there are no planned outings', () => {
    const { getByTestId, getByText } = render(
      <PlannedOutingsTimeline
        plannedOutings={[]}
        onAddPlannedOuting={jest.fn()}
      />
    );

    expect(getByTestId('planned-outings-empty')).toBeTruthy();
    expect(getByText('Aucune étape planifiée')).toBeTruthy();
  });

  it('calls onAddPlannedOuting when add button at the bottom is pressed', () => {
    const handleAdd = jest.fn();
    const { getByTestId } = render(
      <PlannedOutingsTimeline
        plannedOutings={mockPlannedOutings}
        onAddPlannedOuting={handleAdd}
      />
    );

    const addBtn = getByTestId('btn-add-planned-outing');
    fireEvent.press(addBtn);

    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectPlannedOuting when a planned outing card is clicked', () => {
    const handleSelect = jest.fn();
    const { getByTestId } = render(
      <PlannedOutingsTimeline
        plannedOutings={mockPlannedOutings}
        onAddPlannedOuting={jest.fn()}
        onSelectPlannedOuting={handleSelect}
      />
    );

    fireEvent.press(getByTestId('planned-outing-card-po-1'));
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'po-1',
        title: 'Apéro Bar',
      })
    );
  });
});
