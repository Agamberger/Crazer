import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CalendarPickerView } from '../CalendarPickerView';

describe('CalendarPickerView Component', () => {
  const mockDate = new Date('2026-08-30T18:00:00.000Z');

  it('renders month header and week day labels', () => {
    const { getByTestId, getByText } = render(
      <CalendarPickerView
        selectedDate={mockDate}
        viewYear={2026}
        viewMonth={7} // Août
        onPrevMonth={jest.fn()}
        onNextMonth={jest.fn()}
        onSelectDay={jest.fn()}
      />
    );

    expect(getByTestId('month-title')).toBeTruthy();
    expect(getByText(/Août 2026/)).toBeTruthy();
    expect(getByText('Lun')).toBeTruthy();
    expect(getByText('Dim')).toBeTruthy();
  });

  it('triggers navigation when month buttons are clicked', () => {
    const handlePrev = jest.fn();
    const handleNext = jest.fn();

    const { getByTestId } = render(
      <CalendarPickerView
        selectedDate={mockDate}
        viewYear={2026}
        viewMonth={7}
        onPrevMonth={handlePrev}
        onNextMonth={handleNext}
        onSelectDay={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('btn-prev-month'));
    expect(handlePrev).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('btn-next-month'));
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectDay when a day cell is clicked', () => {
    const handleSelectDay = jest.fn();

    const { getByTestId } = render(
      <CalendarPickerView
        selectedDate={mockDate}
        viewYear={2026}
        viewMonth={7}
        onPrevMonth={jest.fn()}
        onNextMonth={jest.fn()}
        onSelectDay={handleSelectDay}
      />
    );

    fireEvent.press(getByTestId('day-cell-15'));
    expect(handleSelectDay).toHaveBeenCalledWith(15);
  });
});
