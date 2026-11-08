import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlannedStepEditStep } from '../components/PlannedStepEditStep';
import { PlaceItem } from '../types/carte';
import { OutingRow } from '@/shared/types';

const outing: OutingRow = {
  id: 'outing-1',
  title: 'Soirée entre amis',
  description: null,
  start_date: '2026-09-01T19:00:00.000Z',
  created_by: 'user-1',
  status: 'planned',
  cover_image: null,
  outing_type: null,
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

const place: PlaceItem = {
  id: 'place-1',
  title: 'Café de Flore',
  category: 'resto',
  latitude: 48.854,
  longitude: 2.333,
  address: '172 Boulevard Saint-Germain, 75006 Paris',
  rating: 0,
  reviewsCount: 0,
};

const renderStep = (props: Partial<React.ComponentProps<typeof PlannedStepEditStep>> = {}) =>
  render(
    <PlannedStepEditStep
      outing={outing}
      place={place}
      onChangeOuting={jest.fn()}
      onSubmit={jest.fn()}
      isSubmitting={false}
      error={null}
      {...props}
    />,
  );

jest.mock('@/features/outings/hooks/useStepBaseDate', () => ({
  useStepBaseDate: jest.fn((o: OutingRow) => (o.start_date ? new Date(o.start_date) : null)),
}));

describe('PlannedStepEditStep', () => {
  it('shows a loader until the base date of an undated outing is resolved', () => {
    const { getByTestId, queryByTestId } = renderStep({ outing: { ...outing, start_date: null } });
    expect(getByTestId('step-base-date-loader')).toBeTruthy();
    expect(queryByTestId('input-planned-title')).toBeNull();
  });

  it('reminds the chosen outing and prefills the step with the place', () => {
    const { getByTestId, getByText } = renderStep();

    expect(getByTestId('step-edit-planned')).toBeTruthy();
    expect(getByText('Soirée entre amis')).toBeTruthy();
    expect(getByTestId('input-planned-title').props.value).toBe('Café de Flore');
  });

  it('goes back to the outing picker from "Changer" and from the form cancel button', () => {
    const onChangeOuting = jest.fn();
    const { getByTestId } = renderStep({ onChangeOuting });

    fireEvent.press(getByTestId('btn-back-to-outings-list'));
    fireEvent.press(getByTestId('btn-cancel-planned-step'));
    expect(onChangeOuting).toHaveBeenCalledTimes(2);
  });

  it('submits the form values', async () => {
    const onSubmit = jest.fn();
    const { getByTestId } = renderStep({ onSubmit });

    fireEvent.press(getByTestId('btn-submit-planned-step'));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Café de Flore' })),
    );
  });

  it('shows the submit error', () => {
    const { getByText } = renderStep({ error: "Erreur lors de l'enregistrement de l'étape" });

    expect(getByText("Erreur lors de l'enregistrement de l'étape")).toBeTruthy();
  });
});
