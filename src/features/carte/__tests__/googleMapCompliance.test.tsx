import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { GoogleAttribution } from '../components/GoogleAttribution';
import { GooglePlaceMapTeaser } from '../components/GooglePlaceMapTeaser';
import { buildPlannedStepValues } from '../components/PlannedStepForm';
import { PlacePhotoGallery } from '../components/PlacePhotoGallery';
import { PlacePredictionsDropdown } from '../components/PlacePredictionsDropdown';
import { useGooglePlaceSheet } from '../hooks/useGooglePlaceSheet';
import { GOOGLE_PIN_LABEL, toMapPinPlace } from '../utils/mapPins';
import { PlaceItem } from '../types/carte';

const crazerPlace: PlaceItem = {
  id: 'uuid-1',
  title: 'Le Burger Gourmet',
  category: 'resto',
  latitude: 48.86,
  longitude: 2.33,
  address: '15 rue de la Paix',
  rating: 4.2,
  reviewsCount: 10,
  phone: '01 02',
};

const googlePlace: PlaceItem = {
  ...crazerPlace,
  id: 'google-ChIJ1',
  googlePlaceId: 'ChIJ1',
  title: 'Tour Eiffel',
  category: 'culture',
  images: ['https://photo'],
  openingHours: ['lundi: 09:00 – 23:00'],
};

describe('toMapPinPlace', () => {
  it('keeps a Crazer place as is', () => {
    expect(toMapPinPlace(crazerPlace)).toBe(crazerPlace);
  });

  it('reduces a Google place to its location and place ID', () => {
    expect(toMapPinPlace(googlePlace)).toEqual({
      id: 'google-ChIJ1',
      googlePlaceId: 'ChIJ1',
      title: GOOGLE_PIN_LABEL,
      category: 'activite',
      latitude: 48.86,
      longitude: 2.33,
      address: '',
      rating: 0,
      reviewsCount: 0,
    });
  });
});

describe('useGooglePlaceSheet', () => {
  it('opens for a selected Google place, closes and reopens', () => {
    const { result, rerender } = renderHook(
      ({ place }: { place: PlaceItem | null }) => useGooglePlaceSheet(place),
      { initialProps: { place: null as PlaceItem | null } },
    );
    expect(result.current.sheetPlaceId).toBeNull();

    rerender({ place: googlePlace });
    expect(result.current.sheetPlaceId).toBe('ChIJ1');

    act(() => result.current.close());
    expect(result.current.sheetPlaceId).toBeNull();
    act(() => result.current.open());
    expect(result.current.sheetPlaceId).toBe('ChIJ1');

    rerender({ place: crazerPlace });
    expect(result.current.sheetPlaceId).toBeNull();
  });
});

describe('GooglePlaceMapTeaser', () => {
  it('shows no Google content and opens the sheet', () => {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    render(<GooglePlaceMapTeaser onOpen={onOpen} onClose={onClose} />);

    expect(screen.getByText('📍 Lieu choisi')).toBeTruthy();
    fireEvent.press(screen.getByTestId('google-place-teaser-open'));
    fireEvent.press(screen.getByTestId('google-place-teaser-close'));
    expect(onOpen).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('GoogleAttribution', () => {
  it('opens the place on Google Maps', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    render(<GoogleAttribution googleMapsUri="https://maps.google.com/?cid=1" />);

    expect(screen.getByText('Google Maps')).toBeTruthy();
    fireEvent.press(screen.getByTestId('google-attribution-link'));
    expect(openURL).toHaveBeenCalledWith('https://maps.google.com/?cid=1');
  });

  it('names both sources discreetly when Crazer data is shown too', () => {
    render(<GoogleAttribution withCrazer />);
    expect(screen.getByText('Google Maps · Crazer')).toBeTruthy();
  });

  it('shows only the credit without a link', () => {
    render(<GoogleAttribution />);
    expect(screen.queryByTestId('google-attribution-link')).toBeNull();
  });
});

describe('PlacePhotoGallery credits', () => {
  it('credits each photo author', () => {
    render(
      <PlacePhotoGallery
        photos={['https://a', 'https://b']}
        credits={['Jo', undefined]}
        placeTitle="X"
        isExpanded
      />,
    );
    expect(screen.getByText('© Jo')).toBeTruthy();
    expect(screen.queryByTestId('place-photo-credit-1')).toBeNull();
  });
});

describe('PlacePredictionsDropdown attribution', () => {
  it('credits Google Maps under the suggestions', () => {
    render(
      <PlacePredictionsDropdown
        predictions={[{ placeId: 'p', description: 'X', mainText: 'X', types: [] }]}
        onSelectPrediction={jest.fn()}
      />,
    );
    expect(screen.getByTestId('predictions-google-attribution')).toBeTruthy();
  });
});

describe('buildPlannedStepValues', () => {
  const baseDate = new Date('2026-12-01T18:00:00Z');

  it('copies the practical info of a Crazer place into the notes', () => {
    const values = buildPlannedStepValues(baseDate, crazerPlace);
    expect(values.notes).toContain('Adresse : 15 rue de la Paix');
    expect(values.notes).toContain('Tél : 01 02');
  });

  it('copies nothing from Google but the editable title', () => {
    const values = buildPlannedStepValues(baseDate, googlePlace);
    expect(values).toEqual(
      expect.objectContaining({ title: 'Tour Eiffel', description: '', notes: '' }),
    );
  });
});
