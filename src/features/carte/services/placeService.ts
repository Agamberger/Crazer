/**
 * placeService.ts
 *
 * Couche d'accès données pour les Places stockées dans Supabase.
 * Provider-agnostique : supporte les lieux OSM importés et les lieux custom.
 *
 * Fonctions exposées :
 *  - searchPlaces()      → RPC Supabase search_places (full-text + géospatial)
 *  - createCustomPlace() → INSERT d'un lieu créé par l'utilisateur
 *  - upsertPlace()       → INSERT … ON CONFLICT UPDATE (pour imports futurs)
 */

import { supabase } from '@/shared/lib/supabase';
import { Json } from '@/shared/types/database.types';
import {
  CreatePlaceDto,
  PlaceCategory,
  PlaceSearchResult,
  SearchPlacesParams,
} from '@/shared/types/place';

// ──────────────────────────────────────────────────────────────────────────────
// Recherche (full-text + géospatial via RPC SQL)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Recherche des places dans Supabase via la fonction SQL `search_places`.
 * Tous les paramètres sont optionnels.
 *
 * @param params - Critères de recherche (query, coordonnées, catégorie, rayon)
 * @returns Liste de PlaceSearchResult triée par pertinence + proximité
 */
export async function searchPlaces(
  params: SearchPlacesParams = {},
): Promise<PlaceSearchResult[]> {
  const {
    query,
    lat,
    lng,
    radius_m = 2000,
    filter_cat,
    max_results = 30,
  } = params;

  const { data, error } = await supabase.rpc('search_places', {
    query: query ?? undefined,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius_m,
    filter_cat: filter_cat ?? undefined,
    max_results,
  });

  if (error) {
    throw new Error(`[placeService] searchPlaces échoué : ${error.message}`);
  }

  return (data ?? []) as PlaceSearchResult[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Récupération par zone géographique (sans recherche texte)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Charge toutes les places publiques dans un rayon autour d'une position GPS.
 *
 * @param lat       - Latitude du centre
 * @param lng       - Longitude du centre
 * @param radius_m  - Rayon en mètres (défaut : 2000m)
 * @param category  - Filtre optionnel sur la catégorie
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius_m = 2000,
  category?: PlaceCategory,
): Promise<PlaceSearchResult[]> {
  return searchPlaces({ lat, lng, radius_m, filter_cat: category, max_results: 50 });
}

// ──────────────────────────────────────────────────────────────────────────────
// Création d'un lieu custom (par un utilisateur authentifié)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crée un lieu custom dans Supabase.
 * Le champ `source` est forcé à `'custom'`.
 *
 * @param dto - Données du lieu à créer (sans id, created_at, updated_at)
 * @returns L'id du lieu créé
 */
export async function createCustomPlace(
  dto: Omit<CreatePlaceDto, 'source'>,
): Promise<string> {
  // PostGIS Geography attend un WKT : 'POINT(lng lat)'
  const location = `POINT(${dto.longitude} ${dto.latitude})`;

  const { data, error } = await supabase
    .from('places')
    .insert({
      address: dto.address,
      category: dto.category,
      city: dto.city,
      country_code: dto.country_code,
      created_by: dto.created_by,
      description: dto.description,
      images: dto.images,
      is_public: dto.is_public,
      location,
      metadata: dto.metadata as Json,
      name: dto.name,
      opening_hours: dto.opening_hours,
      phone: dto.phone,
      postcode: dto.postcode,
      price_range: dto.price_range,
      rating: dto.rating,
      reviews_count: dto.reviews_count,
      source: 'custom' as const,
      source_id: dto.source_id,
      source_url: dto.source_url,
      street: dto.street,
      tags: dto.tags,
      website: dto.website,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`[placeService] createCustomPlace échoué : ${error.message}`);
  }

  return data.id;
}

// ──────────────────────────────────────────────────────────────────────────────
// Upsert générique (pour imports futurs depuis providers OSM, Google…)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Insère ou met à jour un lieu (basé sur la contrainte UNIQUE source + source_id).
 * Utilisé pour les imports en masse depuis des providers externes.
 *
 * @param dto - Données complètes du lieu incluant source et source_id
 * @returns L'id du lieu créé ou mis à jour
 */
export async function upsertPlace(dto: CreatePlaceDto): Promise<string> {
  const location = `POINT(${dto.longitude} ${dto.latitude})`;

  const { data, error } = await supabase
    .from('places')
    .upsert(
      {
        address: dto.address,
        category: dto.category,
        city: dto.city,
        country_code: dto.country_code,
        created_by: dto.created_by,
        description: dto.description,
        images: dto.images,
        is_public: dto.is_public,
        location,
        metadata: dto.metadata as Json,
        name: dto.name,
        opening_hours: dto.opening_hours,
        phone: dto.phone,
        postcode: dto.postcode,
        price_range: dto.price_range,
        rating: dto.rating,
        reviews_count: dto.reviews_count,
        source: dto.source,
        source_id: dto.source_id,
        source_url: dto.source_url,
        street: dto.street,
        tags: dto.tags,
        website: dto.website,
      },
      { onConflict: 'source,source_id', ignoreDuplicates: false },
    )
    .select('id')
    .single();

  if (error) {
    throw new Error(`[placeService] upsertPlace échoué : ${error.message}`);
  }

  return data.id;
}
