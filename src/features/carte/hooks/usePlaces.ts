/**
 * usePlaces.ts
 *
 * Hook métier pour la feature carte.
 * Gère :
 *  - La géolocalisation de l'utilisateur (expo-location)
 *  - Le chargement des places Supabase autour de la position
 *  - La recherche full-text avec debounce
 *  - Les états isLoading / isLocating / error
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { fetchNearbyPlaces, searchPlaces } from '../services/placeService';
import { placeToPlaceItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';
import { PlaceCategory, SearchPlacesParams } from '@/shared/types/place';

// Rayon de recherche par défaut (2km)
const DEFAULT_RADIUS_M = 2000;
// Délai debounce pour la recherche texte (ms)
const SEARCH_DEBOUNCE_MS = 300;
// Position de repli si la géolocalisation échoue ou est refusée (France centre)
const FALLBACK_LOCATION = { latitude: 46.603354, longitude: 1.888334 };

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
        const lastKnown = await Location.getLastKnownPositionAsync({});
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
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
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
  const loadNearby = useCallback(
    async (lat?: number, lng?: number, category?: PlaceCategory): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUserCoords = userCoords || useMapStore.getState().userLocation;
        const targetLat = lat ?? currentUserCoords?.latitude ?? FALLBACK_LOCATION.latitude;
        const targetLng = lng ?? currentUserCoords?.longitude ?? FALLBACK_LOCATION.longitude;

        const results = await fetchNearbyPlaces(
          targetLat,
          targetLng,
          DEFAULT_RADIUS_M,
          category,
        );

        const places = results.map(placeToPlaceItem);
        setPlaces(places);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur de chargement des lieux';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [userCoords, setPlaces],
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

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        try {
          const params: SearchPlacesParams = {
            query,
            lat: userCoords?.latitude,
            lng: userCoords?.longitude,
            filter_cat: category,
            max_results: 30,
          };
          const results = await searchPlaces(params);
          const places = results.map(placeToPlaceItem);
          setPlaces(places);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Erreur de recherche';
          setError(msg);
        } finally {
          setIsLoading(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    [userCoords, loadNearby, setPlaces],
  );

  // ─── Nettoyage du debounce au démontage ──────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
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
    searchByQuery,
    requestLocation,
    clearError,
  };
}
