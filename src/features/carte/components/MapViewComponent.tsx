import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as MapLibreRN from '@maplibre/maplibre-react-native';
import { colors, typography } from '@/shared/constants/theme';
import { PoiItem } from '../types/carte';
import { useMapStore, MAP_STYLE_URLS } from '../store/useMapStore';

// Safe component extraction for v11+ named exports or legacy default exports or mocks
const mapLibreObj = MapLibreRN as unknown as Record<string, unknown>;
const defaultObj = mapLibreObj?.default as Record<string, unknown> | undefined;

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

// Ensure access token is set (null for open source OpenStreetMap tiles)
try {
  const setToken = mapLibreObj?.setAccessToken || defaultObj?.setAccessToken;
  if (typeof setToken === 'function') {
    (setToken as (token: null) => void)(null);
  }
} catch {
  // Ignored if in mock/test environment
}

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
