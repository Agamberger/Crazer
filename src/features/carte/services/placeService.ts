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
    query = null,
    lat = null,
    lng = null,
    radius_m = 2000,
    filter_cat = null,
    max_results = 20,
  } = params;

  const { data, error } = await supabase.rpc('search_places', {
    search_query: query && query.trim() ? query.trim() : null,
    center_lat: lat,
    center_lng: lng,
    radius_meters: radius_m,
    filter_category: filter_cat || null,
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
 * Insère un lieu externe s'il n'existe pas encore, ou met à jour les données existantes.
 * Utilise la contrainte UNIQUE sur (source, source_id).
 *
 * @param place - Données normalisées du lieu à insérer/mettre à jour
 * @returns L'ID du lieu (UUID) dans la table `places`
 */
export async function upsertPlace(place: CreatePlaceDto): Promise<string> {
  const insertPayload = {
    name: place.name,
    category: place.category,
    location: `POINT(${place.longitude} ${place.latitude})`,
    address: place.address || null,
    street: place.street || null,
    city: place.city || null,
    postcode: place.postcode || null,
    country_code: place.country_code || 'FR',
    source: place.source,
    source_id: place.source_id || null,
    source_url: place.source_url || null,
    description: place.description || null,
    phone: place.phone || null,
    website: place.website || null,
    opening_hours: typeof place.opening_hours === 'string'
      ? place.opening_hours
      : Array.isArray(place.opening_hours)
      ? (place.opening_hours as string[]).join('\n')
      : null,
    price_range: place.price_range || null,
    rating: place.rating || null,
    reviews_count: place.reviews_count || 0,
    images: place.images || [],
    tags: place.tags || [],
    metadata: (place.metadata || {}) as Json,
    created_by: place.created_by || null,
    is_public: place.is_public ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('places')
    .upsert(insertPayload, {
      onConflict: 'source,source_id',
      ignoreDuplicates: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[placeService] Erreur lors de upsertPlace:', error);
    throw new Error(error.message);
  }

  return data.id;
}

/**
 * Crée un lieu personnalisé ajouté manuellement par un utilisateur.
 *
 * @param place - Données du lieu personnalisé
 * @returns L'ID du lieu créé (UUID)
 */
export async function createCustomPlace(
  place: CreatePlaceDto,
): Promise<string> {
  const insertPayload = {
    name: place.name,
    category: place.category,
    location: `POINT(${place.longitude} ${place.latitude})`,
    address: place.address || null,
    street: place.street || null,
    city: place.city || null,
    postcode: place.postcode || null,
    country_code: place.country_code || 'FR',
    source: 'custom' as const,
    source_id: place.source_id || null,
    source_url: place.source_url || null,
    description: place.description || null,
    phone: place.phone || null,
    website: place.website || null,
    opening_hours: typeof place.opening_hours === 'string'
      ? place.opening_hours
      : Array.isArray(place.opening_hours)
      ? (place.opening_hours as string[]).join('\n')
      : null,
    price_range: place.price_range || null,
    rating: place.rating || null,
    reviews_count: place.reviews_count || 0,
    images: place.images || [],
    tags: place.tags || [],
    metadata: (place.metadata || {}) as Json,
    created_by: place.created_by || null,
    is_public: place.is_public ?? true,
  };

  const { data, error } = await supabase
    .from('places')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    console.error('[placeService] Erreur lors de createCustomPlace:', error);
    throw new Error(error.message);
  }

  return data.id;
}

/**
 * Récupère un lieu par son identifiant unique (UUID).
 */
export async function getPlaceById(id: string) {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[placeService] Erreur lors de getPlaceById:', error);
    throw new Error(error.message);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vérification ou Création d'un lieu à partir d'un PlaceItem
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vérifie si le lieu existe déjà dans Supabase (par son id UUID, source/source_id, ou nom & adresse)
 * et ne le crée dans la table `places` que s'il n'existe pas encore.
 *
 * @param place - Données complètes du lieu (PlaceItem)
 * @param userId - ID de l'utilisateur créateur optionnel
 * @returns L'ID du lieu (UUID) dans la table `places`
 */
export async function ensurePlaceExists(
  place: PlaceItem,
  userId?: string,
): Promise<string> {
  let activeUserId = userId;
  if (!activeUserId) {
    try {
      const { data } = await supabase.auth.getUser();
      activeUserId = data?.user?.id;
    } catch {
      // Ignorer l'erreur
    }
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // 1. Si place.id est déjà un UUID existant dans `places`
  if (place.id && uuidRegex.test(place.id)) {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('id')
        .eq('id', place.id)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }
    } catch {
      // Ignorer l'erreur et continuer
    }
  }

  const placeDto = placeItemToCreatePlaceDto(place, activeUserId);

  // 2. Si le lieu a un source_id (Google Places, OSM, Foursquare...),
  // vérifier d'abord s'il existe déjà dans la base par source + source_id
  if (placeDto.source_id) {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('id')
        .eq('source', placeDto.source)
        .eq('source_id', placeDto.source_id)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }
    } catch {
      // Continuer vers l'upsert
    }
  }

  // 3. Vérifier par nom et adresse si un lieu identique existe déjà
  if (placeDto.name && placeDto.address) {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('id')
        .ilike('name', placeDto.name)
        .ilike('address', placeDto.address)
        .maybeSingle();

      if (!error && data?.id) {
        return data.id;
      }
    } catch {
      // Ignorer et continuer vers la création
    }
  }

  // 4. Si le lieu n'existe pas encore :
  // - Si lieu externe avec source_id -> upsertPlace
  // - Si lieu personnalisé sans source_id -> createCustomPlace
  if (placeDto.source_id && placeDto.source !== 'custom') {
    return await upsertPlace(placeDto);
  }

  return await createCustomPlace(placeDto);
}

// ─────────────────────────────────────────────────────────────────────────────
// Alias de rétrocompatibilité POI (dépréciés)
// ─────────────────────────────────────────────────────────────────────────────
export const upsertPoi = upsertPlace;
export const createCustomPoi = createCustomPlace;
export const getPoiById = getPlaceById;
export const ensurePoiExists = ensurePlaceExists;
