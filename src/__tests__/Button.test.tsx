import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/shared/components/Button';

describe('Button Component', () => {
  it('renders correctly with given title', () => {
    const { getByText } = render(<Button title="Organiser une sortie" />);
    expect(getByText('Organiser une sortie')).toBeTruthy();
  });

  it('calls onPress when clicked', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<Button title="Cliquez ici" onPress={onPressMock} />);

    fireEvent.press(getByText('Cliquez ici'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
