import { colors } from '@/shared/constants/theme';
import { MapStyleMode } from './types/carte';

export interface PlaceCategoryLabel {
  name: string;
  badgeColor: string;
}

/** Libellé et couleur de badge par catégorie de lieu (fiche lieu, ajout à une sortie). */
export const PLACE_CATEGORY_LABELS: Record<string, PlaceCategoryLabel> = {
  resto: { name: 'Restaurant', badgeColor: colors.secondary },
  bar: { name: 'Bar & Lounge', badgeColor: colors.accent },
  activite: { name: 'Activité', badgeColor: colors.primary },
  nature: { name: 'Outdoor', badgeColor: colors.success },
  culture: { name: 'Culture', badgeColor: colors.warning },
  all: { name: 'Lieu', badgeColor: colors.primary },
};

export const getPlaceCategoryLabel = (category: string): PlaceCategoryLabel =>
  PLACE_CATEGORY_LABELS[category] || PLACE_CATEGORY_LABELS.all;

/** Base URL of the OpenFreeMap vector styles (free OSM tiles, no API key, provided as-is). */
export const OPENFREEMAP_STYLES_BASE_URL = 'https://tiles.openfreemap.org/styles';

/** MapLibre style URL of each map style mode (native MapLibre and web vector map). */
export const MAP_STYLE_URLS: Record<MapStyleMode, string> = {
  dark: `${OPENFREEMAP_STYLES_BASE_URL}/dark`,
  liberty: `${OPENFREEMAP_STYLES_BASE_URL}/liberty`,
  positron: `${OPENFREEMAP_STYLES_BASE_URL}/positron`,
};

/** Attribution required by OpenFreeMap, OpenMapTiles and OpenStreetMap (HTML, web map). */
export const MAP_ATTRIBUTION_HTML =
  '<a href="https://openfreemap.org" target="_blank" rel="noopener">© OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
