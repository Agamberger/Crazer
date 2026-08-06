import { create } from 'zustand';
import { PoiItem, PoiCategory, MapStyleMode, MapRegion } from '../types/carte';

// OpenStreetMap styles (Raster / Vector styles using standard Osm / CartoDB basemaps)
export const MAP_STYLE_URLS: Record<MapStyleMode, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  outdoor: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

export const INITIAL_POIS: PoiItem[] = [];

export const INITIAL_REGION: MapRegion = {
  latitude: 46.603354,
  longitude: 1.888334,
  zoomLevel: 6,
};

interface MapState {
  pois: PoiItem[];
  selectedCategory: PoiCategory;
  selectedPoiId: string | null;
  searchQuery: string;
  mapStyleMode: MapStyleMode;
  centerRegion: MapRegion;
  userLocation: { latitude: number; longitude: number } | null;
  savedWaypoints: PoiItem[];

  // États asynchrones (Supabase / géolocalisation)
  isLoading: boolean;
  error: string | null;

  // Actions
  setSelectedCategory: (category: PoiCategory) => void;
  setSelectedPoiId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setMapStyleMode: (mode: MapStyleMode) => void;
  setCenterRegion: (region: MapRegion) => void;
  setUserLocation: (location: { latitude: number; longitude: number } | null) => void;
  setPois: (pois: PoiItem[]) => void;
  setIsLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  toggleSavedWaypoint: (poi: PoiItem) => void;
  resetFilters: () => void;
  getFilteredPois: () => PoiItem[];
}

export const useMapStore = create<MapState>((set, get) => ({
  pois: INITIAL_POIS,
  selectedCategory: 'all',
  selectedPoiId: null,
  searchQuery: '',
  mapStyleMode: 'dark',
  centerRegion: INITIAL_REGION,
  userLocation: null,
  savedWaypoints: [],

  // États asynchrones initiaux
  isLoading: false,
  error: null,

  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSelectedPoiId: (id) => set({ selectedPoiId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setMapStyleMode: (mode) => set({ mapStyleMode: mode }),
  setCenterRegion: (region) => set({ centerRegion: region }),
  setUserLocation: (location) => set({ userLocation: location }),
  setPois: (pois) => set({ pois }),
  setIsLoading: (value) => set({ isLoading: value }),
  setError: (message) => set({ error: message }),

  toggleSavedWaypoint: (poi) =>
    set((state) => {
      const exists = state.savedWaypoints.some((item) => item.id === poi.id);
      return {
        savedWaypoints: exists
          ? state.savedWaypoints.filter((item) => item.id !== poi.id)
          : [...state.savedWaypoints, poi],
      };
    }),

  resetFilters: () =>
    set({
      selectedCategory: 'all',
      searchQuery: '',
      selectedPoiId: null,
    }),

  getFilteredPois: () => {
    const { pois, selectedCategory, searchQuery } = get();
    return pois.filter((poi) => {
      const matchesCategory =
        selectedCategory === 'all' || poi.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        poi.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poi.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poi.address.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  },
}));
