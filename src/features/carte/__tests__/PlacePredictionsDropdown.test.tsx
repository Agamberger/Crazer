import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PlacePredictionsDropdown } from '../components/PlacePredictionsDropdown';
import { GooglePlacePrediction } from '../services/googlePlaces';

const predictions: GooglePlacePrediction[] = [
  {
    placeId: 'p1',
    description: 'Tour Eiffel, Paris',
    mainText: 'Tour Eiffel',
    secondaryText: 'Paris, France',
    types: [],
  },
  { placeId: 'p2', description: 'Louvre, Paris', mainText: 'Louvre, Paris', types: [] },
];

describe('PlacePredictionsDropdown', () => {
  it('renders nothing without predictions', () => {
    const { toJSON } = render(
      <PlacePredictionsDropdown predictions={[]} onSelectPrediction={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('lists predictions, falling back to the description without main text', () => {
    const { getByTestId, getByText } = render(
      <PlacePredictionsDropdown predictions={predictions} onSelectPrediction={jest.fn()} />,
    );

    expect(getByTestId('autocomplete-dropdown')).toBeTruthy();
    expect(getByText('Tour Eiffel')).toBeTruthy();
    expect(getByText('Paris, France')).toBeTruthy();
    expect(getByText('Louvre, Paris')).toBeTruthy();
  });

  it('selects a prediction', () => {
    const onSelectPrediction = jest.fn();
    const { getByLabelText } = render(
      <PlacePredictionsDropdown
        predictions={predictions}
        onSelectPrediction={onSelectPrediction}
      />,
    );

    fireEvent.press(getByLabelText('Sélectionner Tour Eiffel'));
    expect(onSelectPrediction).toHaveBeenCalledWith(predictions[0]);
  });
});
