export type PoiCategory = 'all' | 'resto' | 'bar' | 'activite' | 'nature' | 'culture';

export type MapStyleMode = 'dark' | 'voyager' | 'outdoor';

export interface PoiItem {
  id: string;
  title: string;
  category: PoiCategory;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  reviewsCount: number;
  description: string;
  priceRange: string;
  imageUrl?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  zoomLevel: number;
}

export interface MapCategoryFilter {
  id: PoiCategory;
  label: string;
  iconName: string;
}
