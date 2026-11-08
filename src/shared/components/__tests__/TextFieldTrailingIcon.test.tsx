import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextFieldTrailingIcon, TextFieldTrailingIconProps } from '../TextFieldTrailingIcon';

const renderIcon = (props: Partial<TextFieldTrailingIconProps> = {}) =>
  render(
    <TextFieldTrailingIcon
      isPassword={false}
      isSecureVisible={false}
      onToggleSecure={jest.fn()}
      testID="field"
      {...props}
    />,
  );

describe('TextFieldTrailingIcon', () => {
  it('renders nothing without icon nor password', () => {
    expect(renderIcon().toJSON()).toBeNull();
  });

  it('renders a plain icon when there is no action', () => {
    const { queryByTestId } = renderIcon({ icon: 'search' });

    expect(queryByTestId('field-right-icon')).toBeNull();
  });

  it('renders a pressable action icon', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderIcon({ icon: 'close', onPress });

    fireEvent.press(getByLabelText('Action du champ'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('toggles the password visibility instead of the custom action', () => {
    const onPress = jest.fn();
    const onToggleSecure = jest.fn();
    const { getByLabelText, rerender } = renderIcon({
      icon: 'close',
      onPress,
      isPassword: true,
      onToggleSecure,
    });

    fireEvent.press(getByLabelText('Afficher le mot de passe'));
    expect(onToggleSecure).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();

    rerender(
      <TextFieldTrailingIcon
        isPassword
        isSecureVisible
        onToggleSecure={onToggleSecure}
        testID="field"
      />,
    );
    expect(getByLabelText('Masquer le mot de passe')).toBeTruthy();
  });
});
