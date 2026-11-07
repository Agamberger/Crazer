import { useCallback, useRef } from 'react';
import { createPlacesSessionToken } from '../services/googlePlacesService';

/**
 * Durée de vie d'une session Google Places (ms). Google n'accepte une session que
 * pendant quelques minutes : au-delà, les requêtes sont facturées à l'unité.
 */
export const PLACES_SESSION_TTL_MS = 3 * 60 * 1000;

interface PlacesSession {
  token: string;
  startedAt: number;
}

export interface PlacesSessionTokenApi {
  /** Jeton de la session en cours (créé au besoin, renouvelé s'il a expiré). */
  getToken: () => string;
  /** Termine la session : lieu sélectionné ou recherche abandonnée. */
  endSession: () => void;
}

/**
 * Jeton de session Google Places partagé par les frappes d'une recherche et la
 * requête de détail qui la conclut, pour une seule session facturée.
 */
export function usePlacesSessionToken(): PlacesSessionTokenApi {
  const sessionRef = useRef<PlacesSession | null>(null);

  const getToken = useCallback(() => {
    const now = Date.now();
    const session = sessionRef.current;
    if (session && now - session.startedAt < PLACES_SESSION_TTL_MS) {
      return session.token;
    }
    const token = createPlacesSessionToken();
    sessionRef.current = { token, startedAt: now };
    return token;
  }, []);

  const endSession = useCallback(() => {
    sessionRef.current = null;
  }, []);

  return { getToken, endSession };
}
