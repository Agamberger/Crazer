/**
 * Service d'intégration de l'API Google Places
 *
 * Permet d'effectuer de l'autocomplétion de lieux (restreint à la France)
 * et d'en récupérer les détails (coordonnées, adresse, note, catégorie).
 */

import { PlaceCategoryFilter, PlaceItem } from '../types/carte';

const BASE_URL = 'https://maps.googleapis.com/maps/api/place';

function getApiKey(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';
}

export interface GoogleAutocompletePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text?: string;
  };
  types?: string[];
}

export interface GooglePlaceDetailsResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height?: number;
    width?: number;
  }>;
  formatted_phone_number?: string;
  website?: string;
}

interface RawGooglePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  types?: string[];
}

interface RawGooglePhoto {
  photo_reference: string;
  height?: number;
  width?: number;
}

/**
 * Mappe les types Google Places vers nos catégories de base (resto, bar, activite, etc.)
 */
export function mapGoogleTypesToCategory(types?: string[]): PlaceCategoryFilter {
  if (!types || types.length === 0) return 'activite';

  const typeSet = new Set(types);

  if (
    typeSet.has('restaurant') ||
    typeSet.has('cafe') ||
    typeSet.has('bakery') ||
    typeSet.has('meal_takeaway') ||
    typeSet.has('food')
  ) {
    return 'resto';
  }

  if (typeSet.has('bar') || typeSet.has('night_club')) {
    return 'bar';
  }

  if (
    typeSet.has('museum') ||
    typeSet.has('art_gallery') ||
    typeSet.has('church') ||
    typeSet.has('hindu_temple') ||
    typeSet.has('mosque') ||
    typeSet.has('synagogue') ||
    typeSet.has('tourist_attraction')
  ) {
    return 'culture';
  }

  if (
    typeSet.has('park') ||
    typeSet.has('natural_feature') ||
    typeSet.has('campground')
  ) {
    return 'nature';
  }

  return 'activite';
}

/**
 * Convertit un résultat détaillé Google Place en PlaceItem
 */
export function googlePlaceDetailsToPlaceItem(
  details: GooglePlaceDetailsResult
): PlaceItem {
  const category = mapGoogleTypesToCategory(details.types);
  const address =
    details.formatted_address || details.vicinity || 'Adresse non spécifiée';

  const apiKey = getApiKey();
  const photos =
    details.photos?.map((photo) =>
      `${BASE_URL}/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${apiKey}`
    ) || [];

  return {
    id: `google-${details.place_id}`,
    title: details.name,
    category,
    latitude: details.geometry.location.lat,
    longitude: details.geometry.location.lng,
    address,
    rating: details.rating ?? 4.0,
    reviewsCount: details.user_ratings_total ?? 0,
    description: '',
    priceRange: details.price_level ? '€'.repeat(details.price_level) : '',
    imageUrl: photos[0],
    images: photos,
    openingHours: details.opening_hours?.weekday_text,
    isOpenNow: details.opening_hours?.open_now,
    phone: details.formatted_phone_number,
    website: details.website,
  };
}

/**
 * Rétrocompatibilité : alias PoiItem
 */
export const googlePlaceDetailsToPoiItem = googlePlaceDetailsToPlaceItem;

/**
 * Recherche des prédictions d'adresses ou de lieux via Google Places Autocomplete.
 */
export async function fetchGooglePlaceAutocomplete(
  input: string
): Promise<GoogleAutocompletePrediction[]> {
  const apiKey = getApiKey();
  if (!input || input.trim().length < 2) return [];

  if (!apiKey) {
    console.warn('[googlePlacesService] EXPO_PUBLIC_GOOGLE_PLACES_API_KEY est manquante.');
    return [];
  }

  const url = `${BASE_URL}/autocomplete/json?input=${encodeURIComponent(
    input
  )}&components=country:fr&language=fr&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn(`[googlePlacesService] Autocomplete status: ${data.status}`);
      return [];
    }

    return (data.predictions || []).map((p: RawGooglePrediction) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: {
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text,
      },
      types: p.types,
    }));
  } catch (err) {
    console.error('[googlePlacesService] Erreur réseau autocomplete:', err);
    return [];
  }
}

/**
 * Récupère les détails d'un lieu via son place_id Google.
 */
export async function fetchGooglePlaceDetails(
  placeId: string
): Promise<GooglePlaceDetailsResult | null> {
  const apiKey = getApiKey();
  if (!placeId) return null;

  if (!apiKey) {
    console.warn('[googlePlacesService] EXPO_PUBLIC_GOOGLE_PLACES_API_KEY est manquante.');
    return null;
  }

  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'vicinity',
    'geometry',
    'rating',
    'user_ratings_total',
    'price_level',
    'types',
    'opening_hours',
    'photos',
    'formatted_phone_number',
    'website',
  ].join(',');

  const url = `${BASE_URL}/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=${fields}&key=${apiKey}&language=fr`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn(`[googlePlacesService] Place details status: ${data.status}`);
      return null;
    }

    const r = data.result;
    return {
      place_id: r.place_id,
      name: r.name,
      formatted_address: r.formatted_address,
      vicinity: r.vicinity,
      geometry: {
        location: {
          lat: r.geometry?.location?.lat ?? 0,
          lng: r.geometry?.location?.lng ?? 0,
        },
      },
      rating: r.rating,
      user_ratings_total: r.user_ratings_total,
      price_level: r.price_level,
      types: r.types,
      opening_hours: r.opening_hours
        ? {
            open_now: r.opening_hours.open_now,
            weekday_text: r.opening_hours.weekday_text,
          }
        : undefined,
      photos: r.photos?.map((photo: RawGooglePhoto) => ({
        photo_reference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
      })),
      formatted_phone_number: r.formatted_phone_number,
      website: r.website,
    };
  } catch (err) {
    console.error('[googlePlacesService] Erreur réseau place details:', err);
    return null;
  }
}
