import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PlaceDetailActions } from '../components/PlaceDetailActions';

describe('PlaceDetailActions', () => {
  it('triggers directions and add to outing', () => {
    const onGetDirections = jest.fn();
    const onAddToOuting = jest.fn();
    const { getByLabelText, getByTestId } = render(
      <PlaceDetailActions
        isTargetMode={false}
        onGetDirections={onGetDirections}
        onAddToOuting={onAddToOuting}
      />,
    );

    fireEvent.press(getByLabelText("Lancer l'itinéraire"));
    fireEvent.press(getByTestId('add-to-outing-button'));
    expect(onGetDirections).toHaveBeenCalledTimes(1);
    expect(onAddToOuting).toHaveBeenCalledTimes(1);
  });

  it('names the targeted outing in target mode', () => {
    const { getByText, getByLabelText } = render(
      <PlaceDetailActions isTargetMode onGetDirections={jest.fn()} onAddToOuting={jest.fn()} />,
    );

    expect(getByText('+ Ajouter à la sortie')).toBeTruthy();
    expect(getByLabelText('Ajouter ce lieu à la sortie')).toBeTruthy();
  });
});
