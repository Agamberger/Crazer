import { useCallback, useEffect, useState } from 'react';
import { usePlacesSessionToken } from '@/features/carte/hooks/usePlacesSessionToken';
import { toast } from '@/shared/store/useToastStore';
import { activityPlacesService } from '../services/activityPlacesService';
import { ActivityPlaceSuggestion, PickedPlace } from '../types/activityPlaces';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

/**
 * Place search of the activity form: debounced suggestions from the saved Crazer places and
 * from Google Maps, and resolution of the chosen suggestion into a stored place.
 * `onPick` receives the stored place.
 */
export const useActivityPlaceSearch = (userId: string | null, onPick: (place: PickedPlace) => void) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ActivityPlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const { getToken, endSession } = usePlacesSessionToken();

  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions((previous) => (previous.length > 0 ? [] : previous));
      setIsSearching(false);
      return undefined;
    }
    let isCurrent = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const found = await activityPlacesService.searchSuggestions(query.trim(), getToken());
      if (!isCurrent) return;
      setSuggestions(found);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, getToken]);

  const select = useCallback(
    async (suggestion: ActivityPlaceSuggestion) => {
      if (!userId) return;
      setIsResolving(true);
      try {
        const place = await activityPlacesService.resolveSuggestion(suggestion, userId, getToken());
        endSession();
        setQuery('');
        setSuggestions([]);
        onPick(place);
      } catch {
        toast.error('Impossible de récupérer ce lieu.', { title: 'Erreur' });
      } finally {
        setIsResolving(false);
      }
    },
    [userId, getToken, endSession, onPick],
  );

  return { query, setQuery, suggestions, isSearching, isResolving, select };
};
