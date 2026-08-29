import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PoiDetailCard } from '../components/PoiDetailCard';
import { PoiItem } from '../types/carte';

const mockPoi: PoiItem = {
  id: 'poi-1',
  title: 'Bar Le Centenaire',
  category: 'bar',
  latitude: 48.8566,
  longitude: 2.3522,
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
    expect(getByText('4.7')).toBeTruthy();
    expect(getByText('(88 avis)')).toBeTruthy();
    expect(getByText('Un super bar de test pour les sorties.')).toBeTruthy();
    expect(getByText('€€')).toBeTruthy();
  });

  test("doit appeler onClose lors du clic sur le bouton de fermeture", () => {
    const handleClose = jest.fn();
    const { getByTestId } = render(
      <PoiDetailCard poi={mockPoi} onClose={handleClose} />
    );

    fireEvent.press(getByTestId('close-button'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test("doit appeler onAddToOuting lors du clic sur le bouton 'Ajouter à une sortie'", () => {
    const handleAddToOuting = jest.fn();
    const { getByText } = render(
      <PoiDetailCard
        poi={mockPoi}
        onClose={jest.fn()}
        onAddToOuting={handleAddToOuting}
      />
    );

    fireEvent.press(getByText('+ Ajouter à une sortie'));
    expect(handleAddToOuting).toHaveBeenCalledWith(mockPoi);
  });

  test("doit appeler onGetDirections lors du clic sur le bouton Itinéraire", () => {
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

  test("doit afficher les photos et la section d'horaires dépliable", () => {
    const poiWithDetails: PoiItem = {
      ...mockPoi,
      images: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      openingHours: ['Lundi: 09:00–23:00', 'Mardi: 09:00–23:00'],
      isOpenNow: true,
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <PoiDetailCard poi={poiWithDetails} onClose={jest.fn()} />
    );

    expect(getByTestId('place-photos-gallery')).toBeTruthy();
    expect(getByText('🟢 Ouvert')).toBeTruthy();
    expect(getByTestId('opening-hours-section')).toBeTruthy();

    // La liste d'horaires est fermée par défaut
    expect(queryByTestId('opening-hours-list')).toBeNull();

    // Déplier les horaires
    fireEvent.press(getByText("🕒 Horaires d'ouverture"));
    expect(getByTestId('opening-hours-list')).toBeTruthy();
    expect(getByText('Lundi: 09:00–23:00')).toBeTruthy();
  });

  test('doit permettre de basculer en mode plein écran (expanded)', () => {
    const { getByTestId, getByText } = render(
      <PoiDetailCard poi={mockPoi} onClose={jest.fn()} />
    );

    expect(getByTestId('expand-button')).toBeTruthy();
    fireEvent.press(getByTestId('expand-button'));
    expect(getByText('▼')).toBeTruthy();

    // Replier
    fireEvent.press(getByTestId('expand-button'));
    expect(getByText('▲')).toBeTruthy();
  });
});
