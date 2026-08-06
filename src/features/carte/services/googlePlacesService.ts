/**
 * Service d'intégration de l'API Google Places
 *
 * Permet d'effectuer de l'autocomplétion de lieux (restreint à la France)
 * et d'en récupérer les détails (coordonnées, adresse, note, catégorie).
 */

import { PoiCategory, PoiItem } from '../types/carte';

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

/**
 * Mappe les types Google Places vers une catégorie Crazer PoiCategory
 */
export function mapGoogleTypesToCategory(types: string[] = []): PoiCategory {
  if (
    types.some((t) =>
      ['restaurant', 'food', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery'].includes(t)
    )
  ) {
    return 'resto';
  }
  if (types.some((t) => ['bar', 'night_club'].includes(t))) {
    return 'bar';
  }
  if (
    types.some((t) =>
      ['amusement_park', 'bowling_alley', 'casino', 'movie_theater', 'stadium', 'gym', 'spa', 'zoo'].includes(t)
    )
  ) {
    return 'activite';
  }
  if (types.some((t) => ['park', 'campground', 'natural_feature'].includes(t))) {
    return 'nature';
  }
  if (
    types.some((t) =>
      ['art_gallery', 'museum', 'library', 'tourist_attraction', 'church'].includes(t)
    )
  ) {
    return 'culture';
  }
  return 'activite';
}

/**
 * Convertit un résultat de Place Details en un PoiItem prêt pour la carte
 */
export function googlePlaceDetailsToPoiItem(details: GooglePlaceDetailsResult): PoiItem {
  const category = mapGoogleTypesToCategory(details.types);
  const apiKey = getApiKey();

  const photoUrls =
    details.photos?.slice(0, 5).map((p) =>
      `${BASE_URL}/photo?maxwidth=600&photo_reference=${p.photo_reference}&key=${apiKey}`
    ) || [];

  return {
    id: `google-${details.place_id}`,
    title: details.name,
    category,
    latitude: details.geometry.location.lat,
    longitude: details.geometry.location.lng,
    address: details.formatted_address || details.vicinity || 'Adresse non spécifiée',
    rating: details.rating ?? 0,
    reviewsCount: details.user_ratings_total ?? 0,
    description: '',
    priceRange: details.price_level ? '€'.repeat(details.price_level) : '',
    imageUrl: photoUrls[0] || undefined,
    images: photoUrls,
    openingHours: details.opening_hours?.weekday_text,
    isOpenNow: details.opening_hours?.open_now,
    phone: details.formatted_phone_number,
    website: details.website,
  };
}

/**
 * Récupère les suggestions d'autocomplétion pour un texte saisi.
 * Restreint par défaut à la France (country:fr).
 */
export async function fetchGooglePlaceAutocomplete(
  input: string,
  location?: { lat: number; lng: number }
): Promise<GoogleAutocompletePrediction[]> {
  const apiKey = getApiKey();
  if (!input || input.trim().length < 2) {
    return [];
  }

  if (!apiKey) {
    console.warn('[googlePlacesService] EXPO_PUBLIC_GOOGLE_PLACES_API_KEY est manquante.');
    return [];
  }

  let url = `${BASE_URL}/autocomplete/json?input=${encodeURIComponent(
    input
  )}&key=${apiKey}&language=fr&components=country:fr`;

  if (location) {
    url += `&location=${location.lat},${location.lng}&radius=50000`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && Array.isArray(data.predictions)) {
      return data.predictions;
    }

    if (data.status !== 'ZERO_RESULTS') {
      console.warn('[googlePlacesService] Status Autocomplete:', data.status, data.error_message);
    }

    return [];
  } catch (error) {
    console.error('[googlePlacesService] Erreur lors de la requête autocomplete:', error);
    return [];
  }
}

/**
 * Récupère les détails d'un lieu à partir de son place_id
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

  const fields =
    'place_id,name,formatted_address,geometry,types,rating,user_ratings_total,price_level,vicinity,opening_hours,photos,formatted_phone_number,website';
  const url = `${BASE_URL}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}&language=fr`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return data.result as GooglePlaceDetailsResult;
    }

    console.warn('[googlePlacesService] Status Place Details:', data.status, data.error_message);
    return null;
  } catch (error) {
    console.error('[googlePlacesService] Erreur lors de la requête place details:', error);
    return null;
  }
}
