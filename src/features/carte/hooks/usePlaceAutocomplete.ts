import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { useMapStore } from '../store/useMapStore';
import {
  fetchGooglePlaceAutocomplete,
  fetchGooglePlaceDetails,
  GoogleAutocompletePrediction,
  GooglePlaceDetailsResult,
} from '../services/googlePlacesService';
import { usePlacesSessionToken } from './usePlacesSessionToken';

const AUTOCOMPLETE_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

/**
 * Google Places autocomplete of the map search bar, bound to `useMapStore.searchQuery`.
 * Typing is debounced (350 ms, 2 characters min), stale answers are ignored, and one Google
 * session token covers the keystrokes plus the details request of the chosen prediction.
 * `onPlaceDetails` receives the details of the selected prediction.
 */
export function usePlaceAutocomplete(onPlaceDetails: (details: GooglePlaceDetailsResult) => void) {
  const searchQuery = useMapStore((state) => state.searchQuery);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);

  const [predictions, setPredictions] = useState<GoogleAutocompletePrediction[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);
  // Un jeton par session de recherche Google (frappes + détail du lieu choisi)
  const { getToken: getSessionToken, endSession: endPlacesSession } = usePlacesSessionToken();

  // Gérer l'autocomplétion Google Places au fil de la frappe
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (justSelectedRef.current) {
      return;
    }

    // Ignore la réponse si la saisie a changé entre-temps
    let isCurrent = true;

    if (searchQuery.trim().length >= MIN_QUERY_LENGTH && isFocused) {
      debounceTimerRef.current = setTimeout(async () => {
        setIsSearchingGoogle(true);
        try {
          const results = await fetchGooglePlaceAutocomplete(searchQuery, getSessionToken());
          if (!isCurrent) return;
          setPredictions(results);
          if (!justSelectedRef.current) {
            setIsDropdownVisible(results.length > 0);
          }
        } catch {
          if (isCurrent) setPredictions([]);
        } finally {
          if (isCurrent) setIsSearchingGoogle(false);
        }
      }, AUTOCOMPLETE_DEBOUNCE_MS);
    } else if (searchQuery.trim().length < MIN_QUERY_LENGTH) {
      // Recherche effacée : la prochaine saisie ouvre une nouvelle session Google
      endPlacesSession();
      setPredictions([]);
      setIsDropdownVisible(false);
      setIsSearchingGoogle(false);
    }

    return () => {
      isCurrent = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, isFocused, getSessionToken, endPlacesSession]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    justSelectedRef.current = false;
    if (predictions.length > 0 && searchQuery.trim().length >= MIN_QUERY_LENGTH) {
      setIsDropdownVisible(true);
    } else if (searchQuery.trim().length >= MIN_QUERY_LENGTH) {
      fetchGooglePlaceAutocomplete(searchQuery, getSessionToken())
        .then((results) => {
          setPredictions(results);
          if (!justSelectedRef.current) {
            setIsDropdownVisible(results.length > 0);
          }
        })
        .catch(() => {});
    }
  }, [predictions.length, searchQuery, getSessionToken]);

  const handleSelectPrediction = async (prediction: GoogleAutocompletePrediction) => {
    justSelectedRef.current = true;
    setIsFocused(false);
    setIsDropdownVisible(false);
    inputRef.current?.blur();
    Keyboard.dismiss();

    const selectedName = prediction.structured_formatting?.main_text || prediction.description;
    setSearchQuery(selectedName);

    try {
      setIsSearchingGoogle(true);
      const details = await fetchGooglePlaceDetails(prediction.place_id, getSessionToken());
      // La session Google se termine avec la requête de détail
      endPlacesSession();
      if (details) onPlaceDetails(details);
    } catch {
      // Ignorer l'erreur silencieusement ou laisser le store gérer
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  const handleChangeText = (text: string) => {
    justSelectedRef.current = false;
    setIsFocused(true);
    setSearchQuery(text);
  };

  const handleClear = () => {
    setPredictions([]);
    setIsDropdownVisible(false);
  };

  return {
    inputRef,
    searchQuery,
    predictions,
    isSearchingGoogle,
    isDropdownVisible,
    handleFocus,
    handleChangeText,
    handleClear,
    handleSelectPrediction,
  };
}
