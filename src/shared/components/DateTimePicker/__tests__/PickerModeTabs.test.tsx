import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PickerModeTabs } from '../PickerModeTabs';

describe('PickerModeTabs Component', () => {
  it('renders both Date and Heure tabs', () => {
    const { getByTestId, getByText } = render(
      <PickerModeTabs currentMode="date" onModeChange={jest.fn()} />
    );

    expect(getByTestId('tab-picker-date')).toBeTruthy();
    expect(getByTestId('tab-picker-time')).toBeTruthy();
    expect(getByText('Date')).toBeTruthy();
    expect(getByText('Heure')).toBeTruthy();
  });

  it('calls onModeChange when a tab is pressed', () => {
    const handleModeChange = jest.fn();
    const { getByTestId } = render(
      <PickerModeTabs currentMode="date" onModeChange={handleModeChange} />
    );

    fireEvent.press(getByTestId('tab-picker-time'));
    expect(handleModeChange).toHaveBeenCalledWith('time');

    fireEvent.press(getByTestId('tab-picker-date'));
    expect(handleModeChange).toHaveBeenCalledWith('date');
  });
});
