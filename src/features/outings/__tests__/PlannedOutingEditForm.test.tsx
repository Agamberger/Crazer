import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PlannedOutingEditForm } from '../components/PlannedOutingEditForm';
import { PlannedOutingRow } from '@/shared/types';

const mockPlannedOuting: PlannedOutingRow = {
  id: 'po-123',
  outing_id: 'outing-abc',
  place_id: 'place-xyz',
  title: 'Bowling & Billard',
  description: 'Partie de bowling suivie de billard',
  notes: 'Piste 4 réservée',
  scheduled_for: '2026-08-30T20:00:00.000Z',
  duration_min: 90,
  status: 'confirmed',
  created_by: 'user-1',
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

describe('PlannedOutingEditForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with prefilled initial values', () => {
    const { getByTestId, getByText } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByTestId('planned-outing-edit-form')).toBeTruthy();
    expect(getByTestId('input-planned-title').props.value).toBe('Bowling & Billard');
    expect(getByTestId('input-planned-description').props.value).toBe('Partie de bowling suivie de billard');
    expect(getByTestId('input-planned-notes').props.value).toBe('Piste 4 réservée');
    expect(getByTestId('input-planned-duration').props.value).toBe('90');
    expect(getByText('Confirmée')).toBeTruthy();
  });

  it('shows error if title is empty on submit', async () => {
    const handleSubmit = jest.fn();
    const { getByTestId, getByText } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={handleSubmit}
        onCancel={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('input-planned-title'), '');
    fireEvent.press(getByTestId('btn-submit-planned'));

    await waitFor(() => {
      expect(getByText("Le nom de l'étape est obligatoire.")).toBeTruthy();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  it('allows changing status chips', () => {
    const { getByTestId } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('btn-planned-status-pending'));
  });

  it('allows selecting preset duration chips', () => {
    const { getByTestId } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('chip-duration-120'));
    expect(getByTestId('input-planned-duration').props.value).toBe('120');
  });

  it('calls onSubmit with modified values on valid form submission', async () => {
    const handleSubmit = jest.fn();
    const { getByTestId } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={handleSubmit}
        onCancel={jest.fn()}
      />
    );

    fireEvent.changeText(getByTestId('input-planned-title'), 'Super Bowling');
    fireEvent.press(getByTestId('chip-duration-120'));
    fireEvent.changeText(getByTestId('input-planned-notes'), 'Pistes 4 et 5');

    fireEvent.press(getByTestId('btn-submit-planned'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Super Bowling',
          duration_min: 120,
          status: 'confirmed',
          notes: 'Pistes 4 et 5',
        })
      );
    });
  });

  it('calls onCancel when cancel button or back button is clicked', () => {
    const handleCancel = jest.fn();
    const { getByTestId } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.press(getByTestId('btn-cancel-planned'));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('btn-back-to-outing'));
    expect(handleCancel).toHaveBeenCalledTimes(2);
  });

  it('triggers confirmation alert and calls onDelete when confirmed', () => {
    const handleDelete = jest.fn();
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      const confirmButton = buttons?.find((b) => b.style === 'destructive');
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
    });

    const { getByTestId } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        onDelete={handleDelete}
      />
    );

    fireEvent.press(getByTestId('btn-delete-planned'));
    expect(Alert.alert).toHaveBeenCalled();
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('displays error container when error prop is provided', () => {
    const { getByTestId, getByText } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
        error="Erreur réseau lors de la mise à jour"
      />
    );

    expect(getByTestId('error-container')).toBeTruthy();
    expect(getByText('Erreur réseau lors de la mise à jour')).toBeTruthy();
  });
});
