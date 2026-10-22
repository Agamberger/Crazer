import { Place, PlaceCategory, PlaceSource, CreatePlaceDto, PlaceSearchResult } from '@/shared/types';

export type PlaceCategoryFilter = 'all' | 'resto' | 'bar' | 'activite' | 'nature' | 'culture';

export type MapStyleMode = 'dark' | 'voyager' | 'outdoor';

export interface MapRegion {
  latitude: number;
  longitude: number;
  zoomLevel: number;
}

export interface MapCategoryFilter {
  id: PlaceCategoryFilter;
  label: string;
  iconName: string;
}

/**
 * Interface unifiée d'un lieu (Place) pour la carte et les interactions UI.
 * Compatible avec les données Supabase (table `places`) et les API tierces (Google Places, OSM).
 */
export interface PlaceItem {
  id: string;
  title: string;
  category: PlaceCategoryFilter;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  reviewsCount: number;
  description?: string;
  priceRange?: string;
  imageUrl?: string;
  images?: string[];
  openingHours?: string[];
  isOpenNow?: boolean;
  phone?: string;
  website?: string;
}

/**
 * Convertit une entité Place (ou PlaceSearchResult) en PlaceItem pour la carte.
 */
export function placeToPlaceItem(place: Place | PlaceSearchResult): PlaceItem {
  let images: string[] = [];
  if (Array.isArray(place.images) && place.images.length > 0) {
    images = place.images;
  }

  let openingHours: string[] | undefined;
  if (Array.isArray(place.opening_hours)) {
    openingHours = place.opening_hours as string[];
  } else if (typeof place.opening_hours === 'string') {
    openingHours = place.opening_hours.split('\n').filter(Boolean);
  }

  const category = (['resto', 'bar', 'activite', 'nature', 'culture'].includes(place.category)
    ? place.category
    : 'activite') as PlaceCategoryFilter;

  return {
    id: place.id,
    title: place.name,
    category,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    address: place.address || (place.city ? `${place.city}` : 'Adresse inconnue'),
    rating: place.rating !== null ? Number(place.rating) : 4.0,
    reviewsCount: place.reviews_count ?? 0,
    description: place.description || undefined,
    priceRange: place.price_range || undefined,
    imageUrl: images[0],
    images,
    openingHours,
    phone: place.phone || undefined,
    website: place.website || undefined,
  };
}

/**
 * Décompose une adresse textuelle pour extraire street, city, postcode, country_code.
 */
export function parseAddressComponents(address?: string | null): {
  street: string | null;
  city: string | null;
  postcode: string | null;
  country_code: string;
} {
  if (!address || address.trim() === '' || address === 'Adresse non spécifiée') {
    return { street: null, city: null, postcode: null, country_code: 'FR' };
  }

  const cleaned = address.trim();
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);

  let street: string | null = null;
  let city: string | null = null;
  let postcode: string | null = null;
  let country_code = 'FR';

  const postcodeMatch = cleaned.match(/\b(\d{5})\b/);
  if (postcodeMatch) {
    postcode = postcodeMatch[1];
  }

  if (parts.length >= 3) {
    street = parts[0];
    const cityPart = parts[1];
    city = postcode ? cityPart.replace(postcode, '').trim() : cityPart;
    if (parts[2].toLowerCase().includes('france')) {
      country_code = 'FR';
    }
  } else if (parts.length === 2) {
    if (postcode && parts[1].includes(postcode)) {
      street = parts[0];
      city = parts[1].replace(postcode, '').trim();
    } else if (parts[1].toLowerCase().includes('france')) {
      const cityPart = parts[0];
      city = postcode ? cityPart.replace(postcode, '').trim() : cityPart;
    } else {
      street = parts[0];
      city = parts[1];
    }
  } else if (parts.length === 1) {
    if (postcode) {
      city = parts[0].replace(postcode, '').trim() || null;
    } else {
      street = parts[0];
    }
  }

  return {
    street: street || null,
    city: city || null,
    postcode: postcode || null,
    country_code: country_code || 'FR',
  };
}

/**
 * Convertit un PlaceItem en CreatePlaceDto enrichi au maximum avec
 * toutes les colonnes supportées par le schéma SQL `places`.
 */
export function placeItemToCreatePlaceDto(
  place: PlaceItem,
  createdBy?: string,
): CreatePlaceDto {
  const { street, city, postcode, country_code } = parseAddressComponents(place.address);

  // Déterminer la source et le source_id externe
  let source: PlaceSource = 'custom';
  let source_id: string | null = null;

  if (place.id) {
    if (place.id.startsWith('google-')) {
      source = 'google';
      source_id = place.id.replace(/^google-/, '');
    } else if (place.id.startsWith('osm-')) {
      source = 'osm';
      source_id = place.id.replace(/^osm-/, '');
    } else if (place.id.startsWith('fsq-')) {
      source = 'foursquare';
      source_id = place.id.replace(/^fsq-/, '');
    } else if (place.id.startsWith('here-')) {
      source = 'here';
      source_id = place.id.replace(/^here-/, '');
    } else if (place.id.startsWith('geoapify-')) {
      source = 'geoapify';
      source_id = place.id.replace(/^geoapify-/, '');
    } else {
      source = 'custom';
      source_id = place.id;
    }
  }

  const category: PlaceCategory =
    place.category === 'all'
      ? 'autre'
      : (['resto', 'bar', 'activite', 'nature', 'culture'].includes(place.category)
          ? (place.category as PlaceCategory)
          : 'autre');

  const images =
    place.images && place.images.length > 0
      ? place.images
      : place.imageUrl
      ? [place.imageUrl]
      : [];

  const openingHoursStr = Array.isArray(place.openingHours)
    ? place.openingHours.join('\n')
    : typeof place.openingHours === 'string'
    ? place.openingHours
    : null;

  const tags: string[] = [];
  if (place.category && place.category !== 'all') {
    tags.push(place.category);
  }
  if (place.priceRange) {
    tags.push(place.priceRange);
  }
  if (place.isOpenNow !== undefined) {
    tags.push(place.isOpenNow ? 'ouvert' : 'fermé');
  }

  const metadata: Record<string, unknown> = {
    originalPlaceId: place.id,
    isOpenNow: place.isOpenNow,
    rawOpeningHours: place.openingHours,
    priceRange: place.priceRange,
    rawCategory: place.category,
  };

  return {
    name: place.title || 'Lieu sans nom',
    category,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.address || null,
    street,
    city,
    postcode,
    country_code,
    source,
    source_id,
    source_url: null,
    description: place.description || null,
    phone: place.phone || null,
    website: place.website || null,
    opening_hours: openingHoursStr,
    price_range: place.priceRange || null,
    rating: place.rating > 0 ? place.rating : null,
    reviews_count: place.reviewsCount || 0,
    images,
    tags,
    metadata,
    created_by: createdBy || null,
    is_public: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rétrocompatibilité POI → Place
// ─────────────────────────────────────────────────────────────────────────────
export type PoiItem = PlaceItem;
export type PoiCategory = PlaceCategoryFilter;
export const placeToPoiItem = placeToPlaceItem;
export const poiItemToCreatePlaceDto = placeItemToCreatePlaceDto;
export { PlaceSearchResult };
