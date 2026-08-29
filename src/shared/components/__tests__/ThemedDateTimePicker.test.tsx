import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemedDateTimePicker } from '../ThemedDateTimePicker';

describe('ThemedDateTimePicker Component', () => {
  const initialDate = new Date('2026-08-30T18:30:00.000Z');

  it('renders modal when visible is true and shows initial month/year', () => {
    const { getByTestId, getByText } = render(
      <ThemedDateTimePicker
        visible={true}
        value={initialDate}
        mode="date"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByTestId('themed-datetimepicker-modal')).toBeTruthy();
    expect(getByTestId('month-title')).toBeTruthy();
    expect(getByText('Valider')).toBeTruthy();
    expect(getByText('Annuler')).toBeTruthy();
  });

  it('navigates between months with next and previous buttons', () => {
    const { getByTestId } = render(
      <ThemedDateTimePicker
        visible={true}
        value={initialDate}
        mode="date"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const titleBefore = getByTestId('month-title').props.children;
    fireEvent.press(getByTestId('btn-next-month'));
    const titleAfter = getByTestId('month-title').props.children;
    expect(titleBefore).not.toEqual(titleAfter);
  });

  it('switches between date and time modes and selects hour/minute', () => {
    const handleConfirm = jest.fn();
    const { getByTestId } = render(
      <ThemedDateTimePicker
        visible={true}
        value={initialDate}
        mode="date"
        onConfirm={handleConfirm}
        onCancel={jest.fn()}
      />
    );

    // Switch to time mode
    fireEvent.press(getByTestId('tab-picker-time'));

    // Select hour and minute
    fireEvent.press(getByTestId('hour-20'));
    fireEvent.press(getByTestId('minute-45'));

    // Confirm
    fireEvent.press(getByTestId('btn-picker-confirm'));
    expect(handleConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = jest.fn();
    const { getByTestId } = render(
      <ThemedDateTimePicker
        visible={true}
        value={initialDate}
        mode="date"
        onConfirm={jest.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.press(getByTestId('btn-picker-cancel'));
    expect(handleCancel).toHaveBeenCalled();
  });
});
