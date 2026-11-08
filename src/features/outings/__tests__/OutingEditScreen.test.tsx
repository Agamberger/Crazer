import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OutingEditScreen, OutingEditScreenProps } from '../components/OutingEditScreen';
import { OutingRow } from '@/shared/types';

jest.mock('@/features/auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

const outing: OutingRow = {
  id: 'out-1',
  title: 'Sortie Laser Game',
  description: null,
  start_date: '2026-08-30T18:00:00.000Z',
  created_by: 'user-1',
  status: 'draft',
  cover_image: null,
  created_at: '2026-08-24T20:00:00Z',
  updated_at: '2026-08-24T20:00:00Z',
};

const renderScreen = (props: Partial<OutingEditScreenProps> = {}) =>
  render(
    <OutingEditScreen
      outing={outing}
      isLoading={false}
      error={null}
      plannedOutings={[]}
      onSubmit={jest.fn()}
      onCancel={jest.fn()}
      onSelectPlannedOuting={jest.fn()}
      {...props}
    />,
  );

describe('OutingEditScreen', () => {
  it('shows a loader while the outing is loading', () => {
    const { getByTestId } = renderScreen({ outing: undefined, isLoading: true });
    expect(getByTestId('loading-state')).toBeTruthy();
  });

  it('shows a "not found" state that goes back to the list', () => {
    const onCancel = jest.fn();
    const { getByTestId, getByText } = renderScreen({ outing: undefined, onCancel });

    expect(getByTestId('not-found-state')).toBeTruthy();
    fireEvent.press(getByText('Retour aux sorties'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the edit form of the outing', () => {
    const { getByTestId } = renderScreen();
    expect(getByTestId('input-title').props.value).toBe('Sortie Laser Game');
  });
});
