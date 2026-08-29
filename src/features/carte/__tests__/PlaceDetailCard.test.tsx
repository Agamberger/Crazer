import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlaceDetailCard } from '../components/PlaceDetailCard';
import { PlaceItem } from '../types/carte';

const mockPlace: PlaceItem = {
  id: 'test-place-1',
  title: 'Bar Le Centenaire',
  category: 'bar',
  latitude: 48.85,
  longitude: 2.35,
  address: '10 Rue de test, 75000 Paris',
  rating: 4.7,
  reviewsCount: 88,
  description: 'Un super bar de test pour les sorties.',
  priceRange: '€€',
  phone: '0123456789',
  website: 'https://example.com',
};

describe('PlaceDetailCard', () => {
  test('doit afficher les informations du lieu correctement', () => {
    const { getByText } = render(
      <PlaceDetailCard place={mockPlace} onClose={jest.fn()} />
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
      <PlaceDetailCard place={mockPlace} onClose={handleClose} />
    );

    fireEvent.press(getByTestId('close-button'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  test('doit déclencher onAddToOuting lors du clic sur Ajouter à une sortie', () => {
    const handleAdd = jest.fn();
    const { getByText, getByTestId } = render(
      <PlaceDetailCard
        place={mockPlace}
        onClose={jest.fn()}
        onAddToOuting={handleAdd}
      />
    );

    expect(getByTestId('add-to-outing-button')).toBeTruthy();
    fireEvent.press(getByText('+ Ajouter à une sortie'));
    expect(handleAdd).toHaveBeenCalledWith(mockPlace);
  });

  test('doit déclencher onGetDirections lors du clic sur Itinéraire', () => {
    const handleDirections = jest.fn();
    const { getByText } = render(
      <PlaceDetailCard
        place={mockPlace}
        onClose={jest.fn()}
        onGetDirections={handleDirections}
      />
    );

    fireEvent.press(getByText('🗺️ Itinéraire'));
    expect(handleDirections).toHaveBeenCalledWith(mockPlace);
  });

  test("doit afficher les photos et la section d'horaires dépliable", () => {
    const placeWithDetails: PlaceItem = {
      ...mockPlace,
      images: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      openingHours: ['Lundi: 09:00–23:00', 'Mardi: 09:00–23:00'],
      isOpenNow: true,
    };

    const { getByTestId, getByText, queryByTestId } = render(
      <PlaceDetailCard place={placeWithDetails} onClose={jest.fn()} />
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
    const { getByTestId, queryByTestId, getByText } = render(
      <PlaceDetailCard place={mockPlace} onClose={jest.fn()} />
    );

    // Les boutons de contact ne sont pas affichés par défaut
    expect(queryByTestId('contact-buttons-row')).toBeNull();

    // Clic sur la poignée d'expansion
    fireEvent.press(getByTestId('expand-toggle-button'));

    // En mode étendu, les détails de contact doivent apparaître
    expect(getByTestId('contact-buttons-row')).toBeTruthy();
    expect(getByText('📞 0123456789')).toBeTruthy();
    expect(getByText('🌐 Site Web')).toBeTruthy();

    // Clic sur le bouton de réduction
    fireEvent.press(getByTestId('expand-button'));
    expect(queryByTestId('contact-buttons-row')).toBeNull();
  });
});
