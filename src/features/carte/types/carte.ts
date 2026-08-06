import { PlaceSearchResult, CreatePlaceDto } from '@/shared/types/place';

export type PoiCategory = 'all' | 'resto' | 'bar' | 'activite' | 'nature' | 'culture';

export type MapStyleMode = 'dark' | 'voyager' | 'outdoor';

export interface PoiItem {
  id: string;
  title: string;
  category: PoiCategory;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  reviewsCount: number;
  description: string;
  priceRange: string;
  imageUrl?: string;
  images?: string[];
  openingHours?: string[];
  isOpenNow?: boolean;
  phone?: string;
  website?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  zoomLevel: number;
}

export interface MapCategoryFilter {
  id: PoiCategory;
  label: string;
  iconName: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Adaptateurs — conversion bidirectionnelle Place ↔ PoiItem
// Les composants UI (MapViewComponent, PoiDetailCard) continuent de recevoir
// des PoiItem : on ne les modifie pas.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convertit un résultat Supabase (PlaceSearchResult) en PoiItem
 * compatible avec les composants UI existants.
 */
export function placeToPoiItem(place: PlaceSearchResult): PoiItem {
  // PlaceCategory peut valoir 'autre' — on le mappe sur 'activite' pour l'UI
  const category = (place.category === 'autre' ? 'activite' : place.category) as PoiCategory;

  return {
    id: place.id,
    title: place.name,
    category,
    latitude: place.latitude,
    longitude: place.longitude,
    address: [place.address, place.city].filter(Boolean).join(', ') || '',
    rating: place.rating ?? 0,
    reviewsCount: place.reviews_count,
    description: place.description || '',
    priceRange: place.price_range ?? '',
    imageUrl: place.images?.[0],
    images: place.images ?? [],
    openingHours: Array.isArray(place.opening_hours)
      ? place.opening_hours
      : (place.opening_hours as any)?.weekday_text || undefined,
    phone: place.phone || undefined,
    website: place.website || undefined,
  };
}

/**
 * Convertit un PoiItem (hardcodé ou legacy) en CreatePlaceDto
 * pour l'insérer dans Supabase comme lieu custom.
 */
export function poiItemToCreatePlaceDto(
  poi: PoiItem,
  createdBy: string,
): Omit<CreatePlaceDto, 'source'> {
  return {
    name: poi.title,
    category: poi.category === 'all' ? 'autre' : (poi.category as CreatePlaceDto['category']),
    latitude: poi.latitude,
    longitude: poi.longitude,
    address: poi.address,
    city: null,
    street: null,
    postcode: null,
    country_code: 'FR',
    source_id: null,
    source_url: null,
    description: poi.description || null,
    phone: null,
    website: null,
    opening_hours: null,
    price_range: poi.priceRange || null,
    rating: poi.rating || null,
    reviews_count: poi.reviewsCount,
    images: poi.imageUrl ? [poi.imageUrl] : [],
    tags: [],
    metadata: {},
    created_by: createdBy,
    is_public: true,
  };
}

