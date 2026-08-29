import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TimePickerView } from '../TimePickerView';

describe('TimePickerView Component', () => {
  const mockDate = new Date('2026-08-30T18:30:00.000Z');

  it('renders time preview and columns', () => {
    const { getByText } = render(
      <TimePickerView
        selectedDate={mockDate}
        onSelectHour={jest.fn()}
        onSelectMinute={jest.fn()}
      />
    );

    expect(getByText('Heures')).toBeTruthy();
    expect(getByText('Minutes')).toBeTruthy();
  });

  it('allows selecting hour and minute', () => {
    const handleSelectHour = jest.fn();
    const handleSelectMinute = jest.fn();

    const { getByTestId } = render(
      <TimePickerView
        selectedDate={mockDate}
        onSelectHour={handleSelectHour}
        onSelectMinute={handleSelectMinute}
      />
    );

    fireEvent.press(getByTestId('hour-20'));
    expect(handleSelectHour).toHaveBeenCalledWith(20);

    fireEvent.press(getByTestId('minute-45'));
    expect(handleSelectMinute).toHaveBeenCalledWith(45);
  });
});
