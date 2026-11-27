import { PlaceItem } from '../types/carte';

/** Label of a Google pin on the map (its real name may not be shown there). */
export const GOOGLE_PIN_LABEL = 'Lieu Google';

/**
 * What the map may show of a place. Under the Google Maps Platform EEA terms, a Google place
 * can only appear on a non-Google map through its location and place ID: its name, category,
 * rating and photos are dropped from the pin.
 *
 * @param place - place loaded for the map
 * @returns the place itself, or a neutral pin for a Google place
 */
export function toMapPinPlace(place: PlaceItem): PlaceItem {
  if (!place.googlePlaceId) return place;
  return {
    id: place.id,
    googlePlaceId: place.googlePlaceId,
    title: GOOGLE_PIN_LABEL,
    category: 'activite',
    latitude: place.latitude,
    longitude: place.longitude,
    address: '',
    rating: 0,
    reviewsCount: 0,
  };
}
