import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapViewComponent } from '../components/MapViewComponent';
import { useMapStore } from '../store/useMapStore';
import { PlaceItem } from '../types/carte';

const mockPlaces: PlaceItem[] = [
  {
    id: 'place-1',
    title: 'Pizza Mama',
    category: 'resto',
    latitude: 48.8566,
    longitude: 2.3522,
    address: '12 Rue de Rivoli, Paris',
    rating: 4.8,
    reviewsCount: 140,
    description: 'Une pizzeria italienne authentique.',
    priceRange: '€€',
  },
  {
    id: 'place-2',
    title: 'Le Bar Fleuri',
    category: 'bar',
    latitude: 48.8606,
    longitude: 2.3376,
    address: '5 Rue de la Paix, Paris',
    rating: 4.5,
    reviewsCount: 95,
    description: 'Cocktails artisanaux et ambiance tamisée.',
    priceRange: '€€€',
  },
];

describe('MapViewComponent', () => {
  test('doit afficher le conteneur de la carte et les marqueurs', () => {
    const handleSelect = jest.fn();
    const { getByTestId, getByLabelText } = render(
      <MapViewComponent places={mockPlaces} onSelectPlace={handleSelect} />
    );

    expect(getByTestId('map-view-container')).toBeTruthy();
    expect(getByLabelText('Sélectionner Pizza Mama')).toBeTruthy();
    expect(getByLabelText('Sélectionner Le Bar Fleuri')).toBeTruthy();
  });

  test('doit appeler onSelectPlace lors du clic sur un marqueur', () => {
    const handleSelect = jest.fn();
    const { getByLabelText } = render(
      <MapViewComponent places={mockPlaces} onSelectPlace={handleSelect} />
    );

    fireEvent.press(getByLabelText('Sélectionner Pizza Mama'));
    expect(handleSelect).toHaveBeenCalledWith(mockPlaces[0]);
  });

  test('doit gérer le rendu des lieux même si la liste est vide', () => {
    const handleSelect = jest.fn();
    const { getByTestId } = render(
      <MapViewComponent places={[]} onSelectPlace={handleSelect} />
    );

    expect(getByTestId('map-view-container')).toBeTruthy();
  });

  test('doit afficher le marqueur de la position utilisateur si définie', () => {
    useMapStore.getState().setUserLocation({ latitude: 48.86, longitude: 2.35 });

    const handleSelect = jest.fn();
    const { getByLabelText } = render(
      <MapViewComponent places={mockPlaces} onSelectPlace={handleSelect} />
    );

    expect(getByLabelText('Votre position')).toBeTruthy();
  });
});
