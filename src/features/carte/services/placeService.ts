import { Json } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import {
  CreatePlaceDto,
  PlaceCategory,
  PlaceSearchResult,
  PlaceSource,
  SearchPlacesParams,
} from '@/shared/types/place';

import {
  PlaceItem,
  placeItemToCreatePlaceDto,
} from '../types/carte';

/** Code Postgres d'une violation de contrainte d'unicité. */
const UNIQUE_VIOLATION = '23505';

// ─────────────────────────────────────────────────────────────────────────────
// Recherche de lieux (RPC search_places)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recherche des lieux autour d'une position GPS avec filtres et recherche plein texte.
 * Appelle la fonction RPC Supabase `search_places`.
 *
 * @param params - Paramètres de recherche (lat, lng, radius_m, query, filter_cat, max_results)
 * @returns Liste de lieux triés par pertinence / distance
 */
export async function searchPlaces(
  params: SearchPlacesParams,
): Promise<PlaceSearchResult[]> {
  const {
    query,
    lat,
    lng,
    radius_m = 2000,
    filter_cat,
    max_results = 20,
  } = params;

  const { data, error } = await supabase.rpc('search_places', {
    query: query && query.trim() ? query.trim() : undefined,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    radius_m: radius_m ?? 2000,
    filter_cat: filter_cat || undefined,
    max_results,
  });

  if (error) {
    console.error('[placeService] Erreur lors de search_places:', error);
    throw new Error(error.message);
  }

  return (data || []) as PlaceSearchResult[];
}

/**
 * Récupère les lieux dans un rayon géographique donné (les plus proches d'abord).
 * Raccourci vers `searchPlaces` sans recherche textuelle.
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius_m = 2000,
  filter_cat?: PlaceCategory,
  max_results?: number,
): Promise<PlaceSearchResult[]> {
  return searchPlaces({ lat, lng, radius_m, filter_cat, max_results });
}

// ─────────────────────────────────────────────────────────────────────────────
// Création et Upsert de lieux
// ─────────────────────────────────────────────────────────────────────────────

/** Rayon (m) dans lequel un lieu du même nom est considéré comme identique. */
export const SAME_PLACE_RADIUS_M = 75;

/** Normalise un nom pour comparaison : minuscules, sans accents ni espaces superflus. */
export function normalizePlaceName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function hasValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

/** Lieu déjà importé depuis le même provider (source + source_id). */
async function findBySource(source: PlaceSource, sourceId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('places')
    .select('id')
    .eq('source', source)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data?.id ?? null;
}

/** Lieu public du même nom à moins de SAME_PLACE_RADIUS_M mètres. */
async function findSameNameNearby(
  name: string,
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const nearby = await searchPlaces({
    query: name,
    lat: latitude,
    lng: longitude,
    radius_m: SAME_PLACE_RADIUS_M,
    max_results: 10,
  });
  const target = normalizePlaceName(name);
  return nearby.find((place) => normalizePlaceName(place.name) === target)?.id ?? null;
}

/**
 * Retourne l'identifiant du lieu correspondant dans `places`, en le créant si besoin :
 * 1. même provider + même `source_id` (lieu externe déjà importé) ;
 * 2. même nom (casse et accents ignorés) à moins de 75 m ;
 * 3. sinon, insertion d'un nouveau lieu.
 *
 * Un lieu existant n'est jamais réécrit : ses données appartiennent à son créateur.
 *
 * @param dto - Données du lieu à persister
 * @returns L'identifiant UUID du lieu dans Supabase
 * @throws si les coordonnées sont invalides ou si Supabase renvoie une erreur
 */
export async function upsertPlace(dto: CreatePlaceDto): Promise<string> {
  const hasExternalId = Boolean(dto.source_id) && dto.source !== 'custom';

  if (hasExternalId && dto.source_id) {
    const existingId = await findBySource(dto.source, dto.source_id);
    if (existingId) return existingId;
  }

  if (!hasValidCoordinates(dto.latitude, dto.longitude)) {
    throw new Error('Coordonnées du lieu invalides : impossible de l\'enregistrer.');
  }

  const sameNameId = await findSameNameNearby(dto.name, dto.latitude, dto.longitude);
  if (sameNameId) return sameNameId;

  // PostGIS geography point : POINT(lng lat)
  const location = `POINT(${dto.longitude} ${dto.latitude})`;

  const { data: newPlace, error: insertError } = await supabase
    .from('places')
    .insert({
      name: dto.name,
      category: dto.category,
      location,
      address: dto.address,
      street: dto.street,
      city: dto.city,
      postcode: dto.postcode,
      country_code: dto.country_code,
      source: dto.source,
      source_id: dto.source_id,
      source_url: dto.source_url,
      description: dto.description,
      phone: dto.phone,
      website: dto.website,
      opening_hours: dto.opening_hours,
      price_range: dto.price_range,
      rating: dto.rating,
      reviews_count: dto.reviews_count || 0,
      images: dto.images,
      tags: dto.tags,
      metadata: dto.metadata as Json,
      created_by: dto.created_by,
      is_public: dto.is_public,
    })
    .select('id')
    .single();

  if (insertError) {
    // Import concurrent du même lieu externe : on récupère la ligne gagnante.
    if (insertError.code === UNIQUE_VIOLATION && hasExternalId && dto.source_id) {
      const existingId = await findBySource(dto.source, dto.source_id);
      if (existingId) return existingId;
    }
    throw new Error(insertError.message);
  }

  return newPlace.id;
}

/**
 * Crée un lieu personnalisé directement saisi par l'utilisateur.
 *
 * @param place - Données de l'UI représentant le lieu personnalisé
 * @param userId - ID de l'utilisateur créateur
 * @returns UUID du lieu créé
 */
export async function createCustomPlace(
  place: PlaceItem,
  userId?: string,
): Promise<string> {
  const dto = placeItemToCreatePlaceDto(place, userId);
  return upsertPlace(dto);
}

/**
 * S'assure qu'un lieu (carte ou personnalisé) est bien persisté dans la base `places`.
 * Si c'est un UUID existant dans `places`, retourne l'ID tel quel.
 * Sinon, crée ou upsert le lieu et retourne le nouvel UUID.
 *
 * @param place - Données du lieu
 * @param userId - ID de l'utilisateur courant (pour ownership si custom)
 * @returns UUID garanti dans la table `places`
 */
export async function ensurePlaceExists(
  place: PlaceItem,
  userId?: string,
): Promise<string> {
  // Si le lieu a déjà un UUID de base (pas un id 'osm-xxx' ou 'google-xxx')
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      place.id,
    );

  if (isUuid) {
    // Vérifier si l'ID existe déjà dans la base
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('id', place.id)
      .maybeSingle();

    if (existing?.id) {
      return existing.id;
    }
  }

  // Si c'est un POI externe (OSM/Google...) ou un custom non persisté
  const dto = placeItemToCreatePlaceDto(place, userId);
  return upsertPlace(dto);
}
