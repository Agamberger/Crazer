/**
 * Types pour les lieux (places) — provider-agnostique
 *
 * Ces types sont alignés sur la table `public.places` dans Supabase.
 * Un lieu peut provenir de n'importe quelle source externe (OSM, Google,
 * Foursquare…) ou être créé manuellement par un utilisateur Crazer.
 */

// ──────────────────────────────────────────────
// Enums (miroir des types SQL)
// ──────────────────────────────────────────────

/** Origine de la donnée du lieu */
export type PlaceSource =
  | 'osm'
  | 'google'
  | 'foursquare'
  | 'here'
  | 'geoapify'
  | 'custom';

/** Catégorie du lieu (aligné sur PoiCategory de la feature carte) */
export type PlaceCategory =
  | 'resto'
  | 'bar'
  | 'activite'
  | 'nature'
  | 'culture'
  | 'autre';

// ──────────────────────────────────────────────
// Entité principale
// ──────────────────────────────────────────────

/** Lieu tel que stocké dans Supabase */
export interface Place {
  id: string;

  // Core
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;

  // Adresse normalisée
  address: string | null;
  street: string | null;
  city: string | null;
  postcode: string | null;
  country_code: string | null;

  // Source (tracking provider)
  source: PlaceSource;
  source_id: string | null;  // ex: osm_id, google place_id, fsq_id
  source_url: string | null;

  // Données enrichies
  description: string | null;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  price_range: string | null;   // '€' | '€€' | '€€€' | '€€€€' | 'Gratuit'
  rating: number | null;        // 0 → 5
  reviews_count: number;
  images: string[];
  tags: string[];

  // Données brutes du provider (payload JSON original)
  metadata: Record<string, unknown>;

  // Ownership
  created_by: string | null;
  is_public: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// DTO pour la création d'un lieu
// ──────────────────────────────────────────────

/** Payload pour insérer un lieu (custom ou importé) */
export type CreatePlaceDto = Omit<
  Place,
  'id' | 'created_at' | 'updated_at' | 'reviews_count'
> & {
  reviews_count?: number;
};

// ──────────────────────────────────────────────
// Résultat de la fonction RPC search_places
// ──────────────────────────────────────────────

/** Résultat retourné par la fonction SQL `search_places()` */
export interface PlaceSearchResult {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  rating: number | null;
  reviews_count: number;
  price_range: string | null;
  images: string[];
  tags: string[];
  source: PlaceSource;
  distance_m: number | null; // null si pas de coordonnées fournies
}

// ──────────────────────────────────────────────
// Paramètres de recherche
// ──────────────────────────────────────────────

export interface SearchPlacesParams {
  query?: string;
  lat?: number;
  lng?: number;
  radius_m?: number;       // défaut: 2000m
  filter_cat?: PlaceCategory;
  max_results?: number;    // défaut: 30
}

// ──────────────────────────────────────────────
// Adaptateurs (conversion depuis provider externe → Place)
// ──────────────────────────────────────────────

/**
 * Données brutes d'un élément OSM (Overpass API / Photon)
 * Stockées dans le champ `metadata` pour ne rien perdre.
 */
export interface OsmPlaceMetadata {
  osm_type: 'N' | 'W' | 'R'; // Node, Way, Relation
  osm_id: number;
  osm_key: string;    // ex: 'amenity'
  osm_value: string;  // ex: 'restaurant'
  [key: string]: unknown;
}

/** Données brutes d'un résultat Google Places (New API) */
export interface GooglePlaceMetadata {
  place_id: string;
  types: string[];
  business_status?: string;
  [key: string]: unknown;
}

/** Données brutes d'un résultat Foursquare */
export interface FoursquarePlaceMetadata {
  fsq_id: string;
  categories: { id: number; name: string }[];
  [key: string]: unknown;
}
