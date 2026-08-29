import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PlannedOutingEditForm } from '../components/PlannedOutingEditForm';
import { PlannedOutingRow } from '@/shared/types';

describe('PlannedOutingEditForm Component', () => {
  const mockPlannedOuting: PlannedOutingRow = {
    id: 'po-100',
    outing_id: 'out-123',
    title: 'Bowling & Billard',
    description: 'Partie de bowling suivie de billard',
    notes: 'Piste 4 réservée',
    scheduled_for: '2026-08-30T20:00:00.000Z',
    duration_min: 90,
    status: 'pending',
    place_id: null,
    created_by: 'user-123',
    created_at: '2026-08-24T20:00:00Z',
    updated_at: '2026-08-24T20:00:00Z',
  };

  it('renders form fields pre-filled with planned outing data', () => {
    const { getByTestId, getByText } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        parentOutingTitle="Soirée Fun"
        onSubmit={jest.fn()}
      />
    );

    expect(getByText('Sortie : Soirée Fun')).toBeTruthy();
    expect(getByTestId('input-planned-title').props.value).toBe('Bowling & Billard');
    expect(getByTestId('input-planned-description').props.value).toBe(
      'Partie de bowling suivie de billard'
    );
    expect(getByTestId('input-planned-notes').props.value).toBe('Piste 4 réservée');
    expect(getByTestId('input-planned-duration').props.value).toBe('90');
    expect(getByTestId('formatted-planned-date-text')).toBeTruthy();
    expect(getByTestId('formatted-planned-time-text')).toBeTruthy();
    expect(getByText(/En attente/)).toBeTruthy();
    expect(getByText(/Confirmée/)).toBeTruthy();
  });

  it('validates that title is not empty upon submission', async () => {
    const handleSubmit = jest.fn();
    const { getByTestId, getByText } = render(
      <PlannedOutingEditForm plannedOuting={mockPlannedOuting} onSubmit={handleSubmit} />
    );

    fireEvent.changeText(getByTestId('input-planned-title'), '');
    fireEvent.press(getByTestId('btn-submit-planned-edit'));

    await waitFor(() => {
      expect(getByText("Le nom de l'étape est obligatoire.")).toBeTruthy();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('opens ThemedDateTimePicker when date button is pressed and updates date upon confirm', async () => {
    const { getByTestId } = render(
      <PlannedOutingEditForm plannedOuting={mockPlannedOuting} onSubmit={jest.fn()} />
    );

    fireEvent.press(getByTestId('btn-select-planned-date'));
    expect(getByTestId('themed-datetimepicker-modal')).toBeTruthy();

    // Select a day (e.g. 15) and confirm
    fireEvent.press(getByTestId('day-cell-15'));
    fireEvent.press(getByTestId('btn-picker-confirm'));

    expect(getByTestId('formatted-planned-date-text')).toBeTruthy();
  });

  it('allows updating fields (duration presets, status, description) and submitting', async () => {
    const handleSubmit = jest.fn();
    const { getByTestId } = render(
      <PlannedOutingEditForm plannedOuting={mockPlannedOuting} onSubmit={handleSubmit} />
    );

    // Modifier le titre
    fireEvent.changeText(getByTestId('input-planned-title'), 'Super Bowling');

    // Cliquer sur un chip de durée (ex: 2h -> 120min)
    fireEvent.press(getByTestId('chip-duration-120'));
    expect(getByTestId('input-planned-duration').props.value).toBe('120');

    // Changer le statut en confirmed
    fireEvent.press(getByTestId('btn-planned-status-confirmed'));

    // Modifier les notes
    fireEvent.changeText(getByTestId('input-planned-notes'), 'Pistes 4 et 5');

    // Soumettre
    fireEvent.press(getByTestId('btn-submit-planned-edit'));

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

    fireEvent.press(getByTestId('btn-cancel-planned-edit'));
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
        onDelete={handleDelete}
      />
    );

    fireEvent.press(getByTestId('btn-delete-planned-edit'));
    expect(Alert.alert).toHaveBeenCalled();
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it('displays error container when error prop is provided', () => {
    const { getByTestId, getByText } = render(
      <PlannedOutingEditForm
        plannedOuting={mockPlannedOuting}
        onSubmit={jest.fn()}
        error="Une erreur réseau est survenue"
      />
    );

    expect(getByTestId('error-container')).toBeTruthy();
    expect(getByText('Une erreur réseau est survenue')).toBeTruthy();
  });
});
