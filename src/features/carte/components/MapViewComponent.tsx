import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '@/shared/constants/theme';
import { PoiItem } from '../types/carte';
import { useMapStore, MAP_STYLE_URLS } from '../store/useMapStore';

// Safe dynamic resolution of MapLibre React Native for native & Expo Go compatibility
let MapLibreRN: any = null;
let isMapLibreAvailable = false;

try {
  MapLibreRN = require('@maplibre/maplibre-react-native');
  const mapObj = MapLibreRN as unknown as Record<string, unknown>;
  const defObj = mapObj?.default as Record<string, unknown> | undefined;

  const MapComp = mapObj?.Map || mapObj?.MapView || defObj?.Map || defObj?.MapView;
  if (MapComp) {
    isMapLibreAvailable = true;
    const setToken = mapObj?.setAccessToken || defObj?.setAccessToken;
    if (typeof setToken === 'function') {
      (setToken as (token: null) => void)(null);
    }
  }
} catch {
  isMapLibreAvailable = false;
}

const mapLibreObj = (MapLibreRN || {}) as Record<string, unknown>;
const defaultObj = (mapLibreObj?.default || {}) as Record<string, unknown>;

const MapComponent: React.ElementType =
  (mapLibreObj?.Map as React.ElementType) ||
  (mapLibreObj?.MapView as React.ElementType) ||
  (defaultObj?.Map as React.ElementType) ||
  (defaultObj?.MapView as React.ElementType) ||
  View;

const CameraComponent: React.ElementType =
  (mapLibreObj?.Camera as React.ElementType) ||
  (defaultObj?.Camera as React.ElementType) ||
  View;

const MarkerComponent: React.ElementType =
  (mapLibreObj?.Marker as React.ElementType) ||
  (mapLibreObj?.MarkerView as React.ElementType) ||
  (defaultObj?.Marker as React.ElementType) ||
  (defaultObj?.MarkerView as React.ElementType) ||
  View;

export interface MapViewComponentProps {
  pois: PoiItem[];
  onSelectPoi: (poi: PoiItem) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  resto: '🍕',
  bar: '🍸',
  activite: '🎯',
  nature: '🌲',
  culture: '🎨',
  all: '📍',
};

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  pois,
  onSelectPoi,
}) => {
  const mapStyleMode = useMapStore((state) => state.mapStyleMode);
  const selectedPoiId = useMapStore((state) => state.selectedPoiId);
  const centerRegion = useMapStore((state) => state.centerRegion);

  const styleURL = MAP_STYLE_URLS[mapStyleMode];

  // If MapLibre Native Module is available, render native vector map
  if (isMapLibreAvailable) {
    return (
      <View style={styles.container} testID="map-view-container">
        <MapComponent
          style={styles.map}
          mapStyle={styleURL}
          styleURL={styleURL}
          logo={false}
          logoEnabled={false}
          attribution={true}
          attributionEnabled={true}
          compass={true}
          compassEnabled={true}
          testID="maplibre-map-view"
        >
          <CameraComponent
            center={[centerRegion.longitude, centerRegion.latitude]}
            centerCoordinate={[centerRegion.longitude, centerRegion.latitude]}
            zoom={centerRegion.zoomLevel}
            zoomLevel={centerRegion.zoomLevel}
            animationMode="flyTo"
            animationDuration={1000}
          />

          {pois.map((poi) => {
            const isSelected = selectedPoiId === poi.id;
            const emoji = CATEGORY_EMOJIS[poi.category] || CATEGORY_EMOJIS.all;

            return (
              <MarkerComponent
                key={poi.id}
                id={poi.id}
                lngLat={[poi.longitude, poi.latitude]}
                coordinate={[poi.longitude, poi.latitude]}
              >
                <TouchableOpacity
                  style={[
                    styles.markerContainer,
                    isSelected && styles.markerSelected,
                  ]}
                  onPress={() => onSelectPoi(poi)}
                  accessibilityLabel={`Sélectionner ${poi.title}`}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Text style={styles.markerEmoji}>{emoji}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText} numberOfLines={1}>
                        {poi.title}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </MarkerComponent>
            );
          })}
        </MapComponent>
      </View>
    );
  }

  // Fallback interactive grid map view when native MapLibre module is absent (Expo Go)
  return (
    <View style={styles.container} testID="map-view-container">
      <View style={styles.fallbackGrid}>
        <View style={styles.gridOverlay} />
        
        {/* Environment notification badge */}
        <View style={styles.fallbackBadge}>
          <Text style={styles.fallbackBadgeText}>📍 Carte Interactive (Mode Expo Go)</Text>
        </View>

        {/* POIs mapped onto interactive layout */}
        <View style={styles.markersCanvas}>
          {pois.map((poi, idx) => {
            const isSelected = selectedPoiId === poi.id;
            const emoji = CATEGORY_EMOJIS[poi.category] || CATEGORY_EMOJIS.all;

            // Simple layout positioning calculation based on coordinates
            const offsetX = ((poi.longitude - 2.35) * 1200) + 160 + (idx * 30 % 100);
            const offsetY = ((48.86 - poi.latitude) * 1200) + 200 + (idx * 40 % 120);

            return (
              <TouchableOpacity
                key={poi.id}
                style={[
                  styles.markerContainer,
                  styles.fallbackMarker,
                  { left: Math.max(20, Math.min(offsetX, 300)), top: Math.max(80, Math.min(offsetY, 450)) },
                  isSelected && styles.markerSelected,
                ]}
                onPress={() => onSelectPoi(poi)}
                accessibilityLabel={`Sélectionner ${poi.title}`}
                accessibilityRole="button"
                activeOpacity={0.8}
              >
                <Text style={styles.markerEmoji}>{emoji}</Text>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText} numberOfLines={1}>
                      {poi.title}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  fallbackGrid: {
    flex: 1,
    backgroundColor: '#181A20',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallbackBadge: {
    position: 'absolute',
    top: 90,
    left: 16,
    backgroundColor: 'rgba(30, 32, 40, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 10,
  },
  fallbackBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
  },
  markersCanvas: {
    flex: 1,
    position: 'relative',
  },
  fallbackMarker: {
    position: 'absolute',
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  markerSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
    transform: [{ scale: 1.25 }],
    zIndex: 10,
  },
  markerEmoji: {
    fontSize: typography.fontSizes.md,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -22,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    maxWidth: 120,
  },
  selectedBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
});

