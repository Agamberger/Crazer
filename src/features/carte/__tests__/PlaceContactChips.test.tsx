import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { PlaceContactChips } from '../components/PlaceContactChips';

describe('PlaceContactChips', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing without phone nor website', () => {
    expect(render(<PlaceContactChips />).toJSON()).toBeNull();
  });

  it('calls the place phone number', () => {
    const { getByLabelText, queryByLabelText } = render(<PlaceContactChips phone="0145485526" />);

    fireEvent.press(getByLabelText("Appeler l'établissement"));
    expect(Linking.openURL).toHaveBeenCalledWith('tel:0145485526');
    expect(queryByLabelText('Visiter le site internet')).toBeNull();
  });

  it('opens the place website', () => {
    const { getByLabelText } = render(<PlaceContactChips website="https://cafedeflore.fr" />);

    fireEvent.press(getByLabelText('Visiter le site internet'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://cafedeflore.fr');
  });
});
