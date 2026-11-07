/**
 * usePlaces.ts
 *
 * Hook métier pour la feature carte.
 * Gère :
 *  - La géolocalisation de l'utilisateur (expo-location)
 *  - Le chargement des places Supabase autour de la position
 *  - Le chargement des places de la zone visible de la carte (déplacement / zoom)
 *  - La recherche full-text avec debounce
 *  - Les états isLoading / isLocating / error
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { fetchNearbyPlaces, searchPlaces } from '../services/placeService';
import { placeToPlaceItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';
import { MapVisibleArea } from '../utils/leafletMap';
import { PlaceCategory, PlaceSearchResult, SearchPlacesParams } from '@/shared/types/place';

// Rayon de recherche par défaut (2km)
const DEFAULT_RADIUS_M = 2000;
// Délai debounce pour la recherche texte (ms)
const SEARCH_DEBOUNCE_MS = 300;
// Position de repli si la géolocalisation échoue ou est refusée (France centre)
const FALLBACK_LOCATION = { latitude: 46.603354, longitude: 1.888334 };
// Délai avant de charger la zone visible : on attend la fin des déplacements successifs (ms)
const AREA_DEBOUNCE_MS = 400;
// Bornes du rayon de la zone visible (m) : au moins le rayon par défaut, au plus ~la France
const MIN_AREA_RADIUS_M = DEFAULT_RADIUS_M;
const MAX_AREA_RADIUS_M = 1_000_000;
// Nombre maximal de lieux chargés pour une zone visible
const AREA_MAX_RESULTS = 100;
// Une « dernière position connue » plus vieille que ça n'est pas utilisée pour centrer la carte (ms)
const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;
// Délai maximal pour obtenir une position (ms)
const LOCATION_TIMEOUT_MS = 15_000;

/**
 * Options de position. `maximumAge` et `timeout` ne sont lus que sur le web (navigator.geolocation) :
 * sans `maximumAge: 0`, expo-location web accepte une position en cache de n'importe quel âge,
 * éventuellement prise ailleurs.
 */
const getCurrentPositionOptions = (): Location.LocationOptions & {
  maximumAge: number;
  timeout: number;
} => ({
  accuracy: Location.Accuracy.Balanced,
  maximumAge: 0,
  timeout: LOCATION_TIMEOUT_MS,
});

export interface UsePlacesReturn {
  /** Places chargées (format PlaceItem pour les composants UI) */
  isLoading: boolean;
  /** Indique que la géolocalisation est en cours */
  isLocating: boolean;
  /** Message d'erreur si une opération échoue */
  error: string | null;
  /** Position actuelle de l'utilisateur (null si non disponible) */
  userCoords: { latitude: number; longitude: number } | null;
  /** Charge les places autour d'une position (ou de la position actuelle) */
  loadNearby: (lat?: number, lng?: number, category?: PlaceCategory) => Promise<void>;
  /** Charge (après un court délai) les places de la zone visible de la carte */
  loadVisibleArea: (area: MapVisibleArea) => void;
  /** Recherche full-text avec debounce intégré */
  searchByQuery: (query: string, category?: PlaceCategory) => void;
  /** Demande la permission et récupère la position actuelle */
  requestLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  /** Efface l'erreur en cours */
  clearError: () => void;
}

export function usePlaces(): UsePlacesReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const areaDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Numéro du dernier chargement lancé : une réponse plus ancienne arrivée après est ignorée.
  const requestIdRef = useRef(0);

  const setPlaces = useMapStore((state) => state.setPlaces);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);
  const setUserLocation = useMapStore((state) => state.setUserLocation);

  // ─── Géolocalisation ────────────────────────────────────────────────────────

  /**
   * Demande la permission de géolocalisation et retourne les coordonnées.
   * En cas de refus ou d'erreur, retourne null.
   */
  const requestLocation = useCallback(async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    setIsLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      // Essayer d'abord la dernière position connue pour un centrage instantané
      try {
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_MS,
        });
        if (lastKnown) {
          const coords = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          };
          setUserCoords(coords);
          setUserLocation(coords);
          setCenterRegion({ ...coords, zoomLevel: 14 });
        }
      } catch {
        // Ignorer si indisponible
      }

      // Obtenir la position GPS exacte
      const position = await Location.getCurrentPositionAsync(getCurrentPositionOptions());
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserCoords(coords);
      setUserLocation(coords);
      setCenterRegion({ ...coords, zoomLevel: 14 });
      return coords;
    } catch (err) {
      const current = useMapStore.getState().userLocation;
      if (current) {
        return current;
      }
      const msg = err instanceof Error ? err.message : 'Erreur de géolocalisation';
      setError(msg);
      return null;
    } finally {
      setIsLocating(false);
    }
  }, [setCenterRegion, setUserLocation]);

  // ─── Chargement des places à proximité ──────────────────────────────────────

  /**
   * Charge les places Supabase dans un rayon autour d'une position.
   * Si lat/lng sont omis, utilise la position de l'utilisateur ou Paris en repli.
   */
  /** Exécute un chargement de lieux ; seul le plus récent met à jour la carte. */
  const runPlacesRequest = useCallback(
    async (request: () => Promise<PlaceSearchResult[]>, fallbackError: string): Promise<void> => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const results = await request();
        if (requestId !== requestIdRef.current) return;
        setPlaces(results.map(placeToPlaceItem));
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : fallbackError);
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [setPlaces],
  );

  const loadNearby = useCallback(
    async (lat?: number, lng?: number, category?: PlaceCategory): Promise<void> => {
      const currentUserCoords = userCoords || useMapStore.getState().userLocation;
      const targetLat = lat ?? currentUserCoords?.latitude ?? FALLBACK_LOCATION.latitude;
      const targetLng = lng ?? currentUserCoords?.longitude ?? FALLBACK_LOCATION.longitude;

      await runPlacesRequest(
        () => fetchNearbyPlaces(targetLat, targetLng, DEFAULT_RADIUS_M, category),
        'Erreur de chargement des lieux',
      );
    },
    [userCoords, runPlacesRequest],
  );

  // ─── Chargement de la zone visible ──────────────────────────────────────────

  /**
   * Charge les places de la zone affichée par la carte, une fois les déplacements terminés.
   * Sans cela, seuls les lieux à 2 km de la position initiale étaient affichés : rien du tout
   * si la géolocalisation est refusée (centre de la France), et rien de nouveau en se déplaçant.
   */
  const loadVisibleArea = useCallback(
    (area: MapVisibleArea): void => {
      if (areaDebounceRef.current) {
        clearTimeout(areaDebounceRef.current);
      }
      const radius = Math.round(
        Math.min(MAX_AREA_RADIUS_M, Math.max(MIN_AREA_RADIUS_M, area.radiusM)),
      );
      areaDebounceRef.current = setTimeout(() => {
        areaDebounceRef.current = null;
        runPlacesRequest(
          () =>
            fetchNearbyPlaces(area.latitude, area.longitude, radius, undefined, AREA_MAX_RESULTS),
          'Erreur de chargement des lieux',
        );
      }, AREA_DEBOUNCE_MS);
    },
    [runPlacesRequest],
  );

  // ─── Recherche full-text avec debounce ──────────────────────────────────────

  /**
   * Lance une recherche full-text dans Supabase après un délai de 300ms.
   * Annule automatiquement la recherche précédente si l'utilisateur tape vite.
   */
  const searchByQuery = useCallback(
    (query: string, category?: PlaceCategory): void => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Si la query est vide, on recharge les lieux à proximité
      if (!query.trim()) {
        loadNearby(undefined, undefined, category);
        return;
      }

      debounceRef.current = setTimeout(() => {
        const params: SearchPlacesParams = {
          query,
          lat: userCoords?.latitude,
          lng: userCoords?.longitude,
          filter_cat: category,
          max_results: 30,
        };
        runPlacesRequest(() => searchPlaces(params), 'Erreur de recherche');
      }, SEARCH_DEBOUNCE_MS);
    },
    [userCoords, loadNearby, runPlacesRequest],
  );

  // ─── Nettoyage du debounce au démontage ──────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (areaDebounceRef.current) {
        clearTimeout(areaDebounceRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isLoading,
    isLocating,
    error,
    userCoords,
    loadNearby,
    loadVisibleArea,
    searchByQuery,
    requestLocation,
    clearError,
  };
}
