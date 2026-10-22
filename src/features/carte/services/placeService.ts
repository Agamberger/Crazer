import { Json } from '@/shared/types';
import { supabase } from '@/shared/lib/supabase';
import {
  CreatePlaceDto,
  PlaceCategory,
  PlaceSearchResult,
  SearchPlacesParams,
} from '@/shared/types/place';
import {
  PlaceItem,
  placeItemToCreatePlaceDto,
} from '../types/carte';

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
 * Récupère les lieux dans un rayon géographique donné.
 * Raccourci vers `searchPlaces` sans recherche textuelle.
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radius_m = 2000,
  filter_cat?: PlaceCategory,
): Promise<PlaceSearchResult[]> {
  return searchPlaces({ lat, lng, radius_m, filter_cat });
}

// ─────────────────────────────────────────────────────────────────────────────
// Création et Upsert de lieux
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert un lieu dans la base de données :
 * - Si le lieu existe déjà (même source + source_id, ou même nom + coordonnées proches), il est mis à jour
 * - Sinon, il est créé
 *
 * @param dto - Données du lieu à persister
 * @returns L'identifiant UUID du lieu dans Supabase
 */
export async function upsertPlace(dto: CreatePlaceDto): Promise<string> {
  // 1. Recherche par source_id si disponible
  if (dto.source_id && dto.source !== 'custom') {
    const { data: existingBySource } = await supabase
      .from('places')
      .select('id')
      .eq('source', dto.source)
      .eq('source_id', dto.source_id)
      .maybeSingle();

    if (existingBySource?.id) {
      // Mise à jour des informations enrichies
      await supabase
        .from('places')
        .update({
          name: dto.name,
          category: dto.category,
          address: dto.address,
          description: dto.description,
          phone: dto.phone,
          website: dto.website,
          opening_hours: dto.opening_hours,
          price_range: dto.price_range,
          rating: dto.rating,
          reviews_count: dto.reviews_count,
          images: dto.images,
          tags: dto.tags,
          metadata: dto.metadata as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBySource.id);

      return existingBySource.id;
    }
  }

  // 2. Recherche par nom exact si c'est un lieu personnalisé ou si pas de source_id
  const { data: existingByName } = await supabase
    .from('places')
    .select('id')
    .ilike('name', dto.name)
    .maybeSingle();

  if (existingByName?.id) {
    return existingByName.id;
  }

  // 3. Insertion d'un nouveau lieu (PostGIS geography point: POINT(lng lat))
  const longitude = dto.longitude ?? 0;
  const latitude = dto.latitude ?? 0;
  const location = `POINT(${longitude} ${latitude})`;

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
    console.error('[placeService] Erreur lors de la création du lieu:', insertError);
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

  if (isUuid && !place.id.startsWith('custom-')) {
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
