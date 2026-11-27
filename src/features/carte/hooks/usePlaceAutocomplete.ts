import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { useMapStore } from '../store/useMapStore';
import {
  getGooglePlaceDetails,
  GooglePlaceDetails,
  GooglePlacePrediction,
  GooglePlacesError,
  searchGooglePlacePredictions,
} from '../services/googlePlaces';
import { usePlacesSessionToken } from './usePlacesSessionToken';

const AUTOCOMPLETE_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;
const GENERIC_SEARCH_ERROR = 'Recherche Google indisponible.';

const toUserMessage = (error: unknown): string =>
  error instanceof GooglePlacesError ? error.userMessage : GENERIC_SEARCH_ERROR;

/**
 * Google Places autocomplete of the map search bar, bound to `useMapStore.searchQuery`.
 * Typing is debounced (350 ms, 2 characters min), stale answers are ignored, and one Google
 * session token covers the keystrokes plus the details request of the chosen prediction.
 * `onPlaceDetails` receives the details of the selected prediction; failures (quota, network,
 * missing key…) are exposed as a French `searchError` message.
 */
export function usePlaceAutocomplete(onPlaceDetails: (details: GooglePlaceDetails) => void) {
  const searchQuery = useMapStore((state) => state.searchQuery);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);

  const [predictions, setPredictions] = useState<GooglePlacePrediction[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
        setSearchError(null);
        try {
          const results = await searchGooglePlacePredictions(searchQuery, getSessionToken());
          if (!isCurrent) return;
          setPredictions(results);
          if (!justSelectedRef.current) {
            setIsDropdownVisible(results.length > 0);
          }
        } catch (error: unknown) {
          if (!isCurrent) return;
          setPredictions([]);
          setSearchError(toUserMessage(error));
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
      setSearchError(null);
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
      searchGooglePlacePredictions(searchQuery, getSessionToken())
        .then((results) => {
          setPredictions(results);
          if (!justSelectedRef.current) {
            setIsDropdownVisible(results.length > 0);
          }
        })
        .catch((error: unknown) => setSearchError(toUserMessage(error)));
    }
  }, [predictions.length, searchQuery, getSessionToken]);

  const handleSelectPrediction = async (prediction: GooglePlacePrediction) => {
    justSelectedRef.current = true;
    setIsFocused(false);
    setIsDropdownVisible(false);
    inputRef.current?.blur();
    Keyboard.dismiss();

    const selectedName = prediction.mainText;
    setSearchQuery(selectedName);

    try {
      setIsSearchingGoogle(true);
      setSearchError(null);
      const details = await getGooglePlaceDetails(prediction.placeId, getSessionToken());
      onPlaceDetails(details);
    } catch (error: unknown) {
      setSearchError(toUserMessage(error));
    } finally {
      // La session Google se termine avec la requête de détail
      endPlacesSession();
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
    setSearchError(null);
  };

  return {
    inputRef,
    searchQuery,
    predictions,
    isSearchingGoogle,
    isDropdownVisible,
    searchError,
    handleFocus,
    handleChangeText,
    handleClear,
    handleSelectPrediction,
  };
}
