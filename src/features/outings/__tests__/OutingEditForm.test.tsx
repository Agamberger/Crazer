import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { OutingEditForm } from '../components/OutingEditForm';
import { OutingRow } from '@/shared/types';

describe('OutingEditForm Component', () => {
  const mockOuting: OutingRow = {
    id: 'out-123',
    title: 'Sortie Laser Game',
    description: 'Une après-midi sympa',
    start_date: '2026-08-30T18:00:00.000Z',
    created_by: 'user-123',
    status: 'draft',
    cover_image: null,
    created_at: '2026-08-24T20:00:00Z',
    updated_at: '2026-08-24T20:00:00Z',
  };

  it('renders form fields pre-filled with outing data including editable title and formatted date and time', () => {
    const { getByTestId, getByText } = render(
      <OutingEditForm outing={mockOuting} onSubmit={jest.fn()} />
    );

    const titleInput = getByTestId('input-title');
    const descriptionInput = getByTestId('input-description');
    const dateBtn = getByTestId('btn-select-date');
    const timeBtn = getByTestId('btn-select-time');

    expect(titleInput.props.value).toBe('Sortie Laser Game');
    expect(descriptionInput.props.value).toBe('Une après-midi sympa');
    expect(dateBtn).toBeTruthy();
    expect(timeBtn).toBeTruthy();
    expect(getByTestId('formatted-date-text')).toBeTruthy();
    expect(getByTestId('formatted-time-text')).toBeTruthy();
    expect(getByText(/Brouillon/)).toBeTruthy();
    expect(getByText(/Planifiée/)).toBeTruthy();
  });

  it('validates that title is not empty upon submission', async () => {
    const handleSubmit = jest.fn();
    const { getByTestId, getByText } = render(
      <OutingEditForm outing={mockOuting} onSubmit={handleSubmit} />
    );

    const titleInput = getByTestId('input-title');
    fireEvent.changeText(titleInput, '');

    const submitBtn = getByTestId('btn-submit-outing-edit');
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(getByText('Le titre de la sortie est obligatoire.')).toBeTruthy();
    });
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('opens ThemedDateTimePicker when date button is pressed and updates date upon confirm', async () => {
    const { getByTestId } = render(
      <OutingEditForm outing={mockOuting} onSubmit={jest.fn()} />
    );

    fireEvent.press(getByTestId('btn-select-date'));
    expect(getByTestId('themed-datetimepicker-modal')).toBeTruthy();

    // Select a day (e.g. 15) and confirm
    fireEvent.press(getByTestId('day-cell-15'));
    fireEvent.press(getByTestId('btn-picker-confirm'));

    expect(getByTestId('formatted-date-text')).toBeTruthy();
  });

  it('allows changing status and submitting updated data', async () => {
    const handleSubmit = jest.fn();
    const { getByTestId } = render(
      <OutingEditForm outing={mockOuting} onSubmit={handleSubmit} />
    );

    // Modifier le titre
    fireEvent.changeText(getByTestId('input-title'), 'Nouveau Titre');
    // Modifier la description
    fireEvent.changeText(getByTestId('input-description'), 'Nouvelle description');
    // Changer le statut en 'planned'
    fireEvent.press(getByTestId('btn-status-planned'));

    // Soumettre
    fireEvent.press(getByTestId('btn-submit-outing-edit'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Nouveau Titre',
          description: 'Nouvelle description',
          status: 'planned',
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = jest.fn();
    const { getByTestId } = render(
      <OutingEditForm outing={mockOuting} onSubmit={jest.fn()} onCancel={handleCancel} />
    );

    fireEvent.press(getByTestId('btn-cancel-outing-edit'));
    expect(handleCancel).toHaveBeenCalled();
  });
});
