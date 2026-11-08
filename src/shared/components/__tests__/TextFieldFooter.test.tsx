import React from 'react';
import { render } from '@testing-library/react-native';
import { TextFieldFooter } from '../TextFieldFooter';

describe('TextFieldFooter', () => {
  it('renders nothing without error, helper text nor counter', () => {
    const { toJSON } = render(<TextFieldFooter showCounter={false} length={0} />);
    expect(toJSON()).toBeNull();
  });

  it('shows the error rather than the helper text', () => {
    const { getByText, queryByText } = render(
      <TextFieldFooter error="Champ requis" helperText="Aide" showCounter={false} length={0} />,
    );

    expect(getByText('Champ requis')).toBeTruthy();
    expect(queryByText('Aide')).toBeNull();
  });

  it('shows the counter only with a max length', () => {
    const { getByText } = render(<TextFieldFooter showCounter maxLength={20} length={5} />);
    expect(getByText('5/20')).toBeTruthy();

    const { toJSON } = render(<TextFieldFooter showCounter length={5} />);
    expect(toJSON()).toBeNull();
  });
});
