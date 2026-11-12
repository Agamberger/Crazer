import {
  fetchGooglePlaceAutocomplete,
  fetchGooglePlaceDetails,
  googlePlaceDetailsToPlaceItem,
} from '@/features/carte/services/googlePlacesService';
import { ensurePlaceExists, searchPlaces } from '@/features/carte/services/placeService';
import { ActivityPlaceSuggestion, PickedPlace } from '../types/activityPlaces';

/** Maximum number of suggestions requested from each source. */
const SUGGESTIONS_PER_SOURCE = 5;

/** Searches the saved Crazer places by text. */
const searchCrazerPlaces = async (query: string): Promise<ActivityPlaceSuggestion[]> => {
  const places = await searchPlaces({ query, max_results: SUGGESTIONS_PER_SOURCE });
  return places.map((place) => ({
    key: place.id,
    source: 'crazer',
    name: place.name,
    subtitle: place.address ?? place.city,
  }));
};

/** Searches Google Maps (Places autocomplete). */
const searchGooglePlaces = async (
  query: string,
  sessionToken: string | undefined,
): Promise<ActivityPlaceSuggestion[]> => {
  const predictions = await fetchGooglePlaceAutocomplete(query, sessionToken);
  return predictions.slice(0, SUGGESTIONS_PER_SOURCE).map((prediction) => ({
    key: prediction.place_id,
    source: 'google',
    name: prediction.structured_formatting?.main_text || prediction.description,
    subtitle: prediction.structured_formatting?.secondary_text ?? null,
  }));
};

export const activityPlacesService = {
  /**
   * Suggestions from the saved Crazer places and from Google Maps. A failing source is
   * ignored so that the other one still answers.
   */
  searchSuggestions: async (
    query: string,
    sessionToken?: string,
  ): Promise<ActivityPlaceSuggestion[]> => {
    const [crazer, google] = await Promise.allSettled([
      searchCrazerPlaces(query),
      searchGooglePlaces(query, sessionToken),
    ]);
    return [
      ...(crazer.status === 'fulfilled' ? crazer.value : []),
      ...(google.status === 'fulfilled' ? google.value : []),
    ];
  },

  /**
   * Returns the stored place of a suggestion. A Google suggestion is imported into
   * `places` first (or matched with the existing copy). Throws when the details are unavailable.
   */
  resolveSuggestion: async (
    suggestion: ActivityPlaceSuggestion,
    userId: string,
    sessionToken?: string,
  ): Promise<PickedPlace> => {
    if (suggestion.source === 'crazer') return { id: suggestion.key, name: suggestion.name };

    const details = await fetchGooglePlaceDetails(suggestion.key, sessionToken);
    if (!details) throw new Error('Lieu Google introuvable');
    const id = await ensurePlaceExists(googlePlaceDetailsToPlaceItem(details), userId);
    return { id, name: details.name };
  },
};
