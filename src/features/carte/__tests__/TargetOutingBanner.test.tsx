import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TargetOutingBanner } from '../components/TargetOutingBanner';

describe('TargetOutingBanner', () => {
  it('shows the targeted outing title', () => {
    const { getByTestId, getByText } = render(
      <TargetOutingBanner outingTitle="Soirée bowling" onClear={jest.fn()} />,
    );

    expect(getByTestId('target-outing-banner')).toBeTruthy();
    expect(getByText('🎯 Ajout à la sortie')).toBeTruthy();
    expect(getByText('Soirée bowling')).toBeTruthy();
  });

  it('leaves the add mode from the close button', () => {
    const onClear = jest.fn();
    const { getByLabelText } = render(
      <TargetOutingBanner outingTitle="Soirée bowling" onClear={onClear} />,
    );

    fireEvent.press(getByLabelText('Quitter le mode ajout'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
