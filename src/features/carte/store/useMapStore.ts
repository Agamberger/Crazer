import { create } from 'zustand';
import { PlaceItem, PlaceCategoryFilter, MapStyleMode, MapRegion } from '../types/carte';

// OpenStreetMap styles (Raster / Vector styles using standard Osm / CartoDB basemaps)
export const MAP_STYLE_URLS: Record<MapStyleMode, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  outdoor: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

export const INITIAL_PLACES: PlaceItem[] = [];
export const INITIAL_POIS = INITIAL_PLACES;

export const INITIAL_REGION: MapRegion = {
  latitude: 46.603354,
  longitude: 1.888334,
  zoomLevel: 6,
};

interface MapState {
  searchQuery: string;
  selectedCategory: PlaceCategoryFilter;
  mapStyleMode: MapStyleMode;
  places: PlaceItem[];
  pois: PlaceItem[];
  savedWaypoints: PlaceItem[];
  selectedPlaceId: string | null;
  selectedPoiId: string | null;
  targetOutingId: string | null;
  centerRegion: MapRegion;
  userLocation: { latitude: number; longitude: number } | null;
  isLoading: boolean;
  error: string | null;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: PlaceCategoryFilter) => void;
  setMapStyleMode: (mode: MapStyleMode) => void;
  setPlaces: (places: PlaceItem[]) => void;
  setPois: (pois: PlaceItem[]) => void;
  toggleSavedWaypoint: (place: PlaceItem) => void;
  setSelectedPlaceId: (id: string | null) => void;
  setSelectedPoiId: (id: string | null) => void;
  setTargetOutingId: (id: string | null) => void;
  setCenterRegion: (region: Partial<MapRegion>) => void;
  setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetFilters: () => void;
  getFilteredPlaces: () => PlaceItem[];
  getFilteredPois: () => PlaceItem[];
}

export const useMapStore = create<MapState>((set, get) => ({
  searchQuery: '',
  selectedCategory: 'all',
  mapStyleMode: 'dark',
  places: INITIAL_PLACES,
  pois: INITIAL_POIS,
  savedWaypoints: [],
  selectedPlaceId: null,
  selectedPoiId: null,
  targetOutingId: null,
  centerRegion: INITIAL_REGION,
  userLocation: null,
  isLoading: false,
  error: null,

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setSelectedCategory: (category: PlaceCategoryFilter) =>
    set({ selectedCategory: category }),

  setMapStyleMode: (mode: MapStyleMode) => set({ mapStyleMode: mode }),

  setPlaces: (places: PlaceItem[]) => set({ places, pois: places }),
  setPois: (pois: PlaceItem[]) => set({ places: pois, pois }),

  toggleSavedWaypoint: (place: PlaceItem) =>
    set((state) => {
      const exists = state.savedWaypoints.some((p) => p.id === place.id);
      return {
        savedWaypoints: exists
          ? state.savedWaypoints.filter((p) => p.id !== place.id)
          : [...state.savedWaypoints, place],
      };
    }),

  setSelectedPlaceId: (id: string | null) =>
    set({ selectedPlaceId: id, selectedPoiId: id }),
  setSelectedPoiId: (id: string | null) =>
    set({ selectedPlaceId: id, selectedPoiId: id }),

  setTargetOutingId: (id: string | null) => set({ targetOutingId: id }),

  setCenterRegion: (region: Partial<MapRegion>) =>
    set((state) => ({
      centerRegion: { ...state.centerRegion, ...region },
    })),

  setUserLocation: (location: { latitude: number; longitude: number } | null) =>
    set({ userLocation: location }),

  setIsLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedCategory: 'all',
      selectedPlaceId: null,
      selectedPoiId: null,
    }),

  getFilteredPlaces: () => {
    const { places, selectedCategory, searchQuery } = get();
    return places.filter((place) => {
      const matchCategory =
        selectedCategory === 'all' || place.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        place.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (place.description &&
          place.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCategory && matchSearch;
    });
  },

  getFilteredPois: () => {
    return get().getFilteredPlaces();
  },
}));
