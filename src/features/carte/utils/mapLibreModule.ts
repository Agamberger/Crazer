import React from 'react';
import { Platform, View } from 'react-native';

/**
 * Safe dynamic resolution of MapLibre React Native, for native builds and Expo Go compatibility.
 * When the native module is missing (Expo Go, web), every component falls back to a plain `View`
 * and `isMapLibreAvailable` is false, so callers render the Leaflet fallback instead.
 */
let mapLibreModule: unknown = null;
let mapLibreAvailable = false;

try {
  // Sur le web, MapLibre React Native n'a pas de rendu : on passe directement au fallback Leaflet.
  if (Platform.OS === 'web') throw new Error('MapLibre natif indisponible sur le web');
  mapLibreModule = require('@maplibre/maplibre-react-native');
  const mapObj = mapLibreModule as Record<string, unknown>;
  const defObj = mapObj?.default as Record<string, unknown> | undefined;

  const MapComp = mapObj?.Map || mapObj?.MapView || defObj?.Map || defObj?.MapView;
  if (MapComp) {
    mapLibreAvailable = true;
    const setToken = mapObj?.setAccessToken || defObj?.setAccessToken;
    if (typeof setToken === 'function') {
      (setToken as (token: null) => void)(null);
    }
  }
} catch {
  mapLibreAvailable = false;
}

const mapLibreObj = (mapLibreModule || {}) as Record<string, unknown>;
const defaultObj = (mapLibreObj?.default || {}) as Record<string, unknown>;

export const isMapLibreAvailable = mapLibreAvailable;

export const MapLibreMap: React.ElementType =
  (mapLibreObj?.Map as React.ElementType) ||
  (mapLibreObj?.MapView as React.ElementType) ||
  (defaultObj?.Map as React.ElementType) ||
  (defaultObj?.MapView as React.ElementType) ||
  View;

export const MapLibreCamera: React.ElementType =
  (mapLibreObj?.Camera as React.ElementType) || (defaultObj?.Camera as React.ElementType) || View;

export const MapLibreMarker: React.ElementType =
  (mapLibreObj?.Marker as React.ElementType) ||
  (mapLibreObj?.MarkerView as React.ElementType) ||
  (defaultObj?.Marker as React.ElementType) ||
  (defaultObj?.MarkerView as React.ElementType) ||
  View;
