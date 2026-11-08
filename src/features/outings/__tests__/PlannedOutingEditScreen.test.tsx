import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PlannedOutingEditScreen,
  PlannedOutingEditScreenProps,
} from '../components/PlannedOutingEditScreen';
import { PlannedOutingRow } from '@/shared/types';

const plannedOuting: PlannedOutingRow = {
  id: 'po-1',
  outing_id: 'out-1',
  place_id: null,
  title: 'Bowling',
  description: null,
  notes: null,
  scheduled_for: '2026-08-30T20:00:00.000Z',
  duration_min: 90,
  status: 'confirmed',
  created_by: 'user-1',
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

const renderScreen = (props: Partial<PlannedOutingEditScreenProps> = {}) =>
  render(
    <PlannedOutingEditScreen
      plannedOuting={plannedOuting}
      parentOutingTitle="Soirée"
      isLoading={false}
      error={null}
      onSubmit={jest.fn()}
      onDelete={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

describe('PlannedOutingEditScreen', () => {
  it('shows a loader while the step is loading', () => {
    const { getByTestId } = renderScreen({ plannedOuting: undefined, isLoading: true });
    expect(getByTestId('planned-loading-state')).toBeTruthy();
  });

  it('shows a "not found" state that goes back to the outing', () => {
    const onCancel = jest.fn();
    const { getByTestId, getByText } = renderScreen({ plannedOuting: undefined, onCancel });

    expect(getByTestId('planned-not-found-state')).toBeTruthy();
    fireEvent.press(getByText('Retour à la sortie'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the step form with the screen testIDs', () => {
    const { getByTestId, getByText } = renderScreen();

    expect(getByTestId('planned-outing-edit-screen')).toBeTruthy();
    expect(getByText('Sortie : Soirée')).toBeTruthy();
    expect(getByTestId('btn-submit-planned-edit')).toBeTruthy();
    expect(getByTestId('btn-cancel-planned-edit')).toBeTruthy();
    expect(getByTestId('btn-delete-planned-edit')).toBeTruthy();
  });
});
