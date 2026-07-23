import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PoiDetailCard } from '../components/PoiDetailCard';
import { PoiItem } from '../types/carte';

const mockPoi: PoiItem = {
  id: 'test-poi-1',
  title: 'Bar Le Centenaire',
  category: 'bar',
  latitude: 48.85,
  longitude: 2.35,
  address: '10 Rue de test, 75000 Paris',
  rating: 4.7,
  reviewsCount: 88,
  description: 'Un super bar de test pour les sorties.',
  priceRange: '€€',
};

describe('PoiDetailCard', () => {
  test('doit afficher les informations du POI correctement', () => {
    const { getByText } = render(
      <PoiDetailCard poi={mockPoi} onClose={jest.fn()} />
    );

    expect(getByText('Bar Le Centenaire')).toBeTruthy();
    expect(getByText('📍 10 Rue de test, 75000 Paris')).toBeTruthy();
    expect(getByText('Un super bar de test pour les sorties.')).toBeTruthy();
    expect(getByText('4.7')).toBeTruthy();
    expect(getByText('Bar & Lounge')).toBeTruthy();
  });

  test('doit déclencher onClose lors du clic sur le bouton de fermeture', () => {
    const handleClose = jest.fn();
    const { getByTestId } = render(
      <PoiDetailCard poi={mockPoi} onClose={handleClose} />
    );

    fireEvent.press(getByTestId('close-button'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('doit déclencher onAddToOuting lors du clic sur Ajouter à la sortie', () => {
    const handleAdd = jest.fn();
    const { getByText } = render(
      <PoiDetailCard
        poi={mockPoi}
        onClose={jest.fn()}
        onAddToOuting={handleAdd}
      />
    );

    fireEvent.press(getByText('+ Ajouter à la sortie'));
    expect(handleAdd).toHaveBeenCalledWith(mockPoi);
  });

  test('doit déclencher onGetDirections lors du clic sur Itinéraire', () => {
    const handleDirections = jest.fn();
    const { getByText } = render(
      <PoiDetailCard
        poi={mockPoi}
        onClose={jest.fn()}
        onGetDirections={handleDirections}
      />
    );

    fireEvent.press(getByText('🗺️ Itinéraire'));
    expect(handleDirections).toHaveBeenCalledWith(mockPoi);
  });
});
