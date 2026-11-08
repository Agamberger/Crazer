import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { AppModalHeader, AppModalHeaderProps } from '../AppModalHeader';

const renderHeader = (props: Partial<AppModalHeaderProps> = {}) =>
  render(
    <AppModalHeader
      isFullScreen={false}
      onClose={jest.fn()}
      closeIcon="close"
      closeAccessibilityLabel="Fermer"
      closeButtonTestID="modal-close"
      {...props}
    />,
  );

describe('AppModalHeader', () => {
  it('renders nothing for an untitled dialog', () => {
    expect(renderHeader().toJSON()).toBeNull();
  });

  it('renders the title and the close button', () => {
    const onClose = jest.fn();
    const { getByText, getByTestId } = renderHeader({ title: 'Ma modale', onClose });

    expect(getByText('Ma modale').props.accessibilityRole).toBe('header');
    fireEvent.press(getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('always renders in full screen, even without title', () => {
    const { getByLabelText } = renderHeader({
      isFullScreen: true,
      closeIcon: 'arrow-back',
      closeAccessibilityLabel: 'Retour',
    });

    expect(getByLabelText('Retour')).toBeTruthy();
  });
});
