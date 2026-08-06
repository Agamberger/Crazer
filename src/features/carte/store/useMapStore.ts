import { create } from 'zustand';
import { PoiItem, PoiCategory, MapStyleMode, MapRegion } from '../types/carte';

// OpenStreetMap styles (Raster / Vector styles using standard Osm / CartoDB basemaps)
export const MAP_STYLE_URLS: Record<MapStyleMode, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  outdoor: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

export const INITIAL_POIS: PoiItem[] = [
  {
    id: 'poi-1',
    title: 'Le Perchoir Marais',
    category: 'bar',
    latitude: 48.8566,
    longitude: 2.3522,
    address: '33 Rue de la Verrerie, 75004 Paris',
    rating: 4.6,
    reviewsCount: 128,
    description: 'Rooftop vue panoramique avec cocktails signature et ambiance festive pour groupe.',
    priceRange: '€€€',
  },
  {
    id: 'poi-2',
    title: 'BAM Karaoke Box',
    category: 'activite',
    latitude: 48.8689,
    longitude: 2.3421,
    address: '50 Rue d\'Aboukir, 75002 Paris',
    rating: 4.8,
    reviewsCount: 240,
    description: 'Boxs privatifs haut de gamme pour chanter entre amis avec service boisson.',
    priceRange: '€€',
  },
  {
    id: 'poi-3',
    title: 'La Felicità',
    category: 'resto',
    latitude: 48.8344,
    longitude: 2.3708,
    address: '55 Boulevard Vincent Auriol, 75013 Paris',
    rating: 4.7,
    reviewsCount: 512,
    description: 'Immense food-market italien de 4500m² avec bars, trattorias et terrasse.',
    priceRange: '€€',
  },
  {
    id: 'poi-4',
    title: 'Parc des Buttes-Chaumont',
    category: 'nature',
    latitude: 48.8809,
    longitude: 2.3828,
    address: '1 Rue Botzaris, 75019 Paris',
    rating: 4.9,
    reviewsCount: 890,
    description: 'Grand parc escarpé idéal pour un pique-nique en groupe au bord du lac.',
    priceRange: 'Gratuit',
  },
  {
    id: 'poi-5',
    title: 'Atelier des Lumières',
    category: 'culture',
    latitude: 48.8614,
    longitude: 2.3804,
    address: '38 Rue Saint-Maur, 75011 Paris',
    rating: 4.8,
    reviewsCount: 340,
    description: 'Centre d\'art numérique proposant d\'immenses expositions immersives.',
    priceRange: '€€',
  },
  {
    id: 'poi-6',
    title: 'Ground Control',
    category: 'bar',
    latitude: 48.8443,
    longitude: 2.3761,
    address: '81 Rue du Charolais, 75012 Paris',
    rating: 4.5,
    reviewsCount: 195,
    description: 'Lieu de vie culturel alternatif avec terrasses, food trucks et DJ sets.',
    priceRange: '€€',
  },
];

export const INITIAL_REGION: MapRegion = {
  latitude: 48.8566,
  longitude: 2.3522,
  zoomLevel: 12,
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
