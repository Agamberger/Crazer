import React from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, typography } from '@/shared/constants/theme';
import { PlaceItem } from '../types/carte';
import { useMapStore, MAP_STYLE_URLS } from '../store/useMapStore';
import {
  buildLeafletHtml,
  buildLeafletUpdateScript,
  CATEGORY_EMOJIS,
  LeafletMapState,
  parseLeafletSelection,
} from '../utils/leafletMap';
import { LeafletWebFrame } from './LeafletWebFrame';

// Safe dynamic resolution of MapLibre React Native for native & Expo Go compatibility
let MapLibreRN: unknown = null;
let isMapLibreAvailable = false;

try {
  // Sur le web, MapLibre React Native n'a pas de rendu : on passe directement au fallback Leaflet.
  if (Platform.OS === 'web') throw new Error('MapLibre natif indisponible sur le web');
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
  places?: PlaceItem[];
  pois?: PlaceItem[];
  onSelectPlace?: (place: PlaceItem) => void;
  onSelectPoi?: (poi: PlaceItem) => void;
}

const USER_MARKER_CONTAINER_BG = 'rgba(59, 130, 246, 0.3)';
const USER_MARKER_DOT_BG = '#3B82F6';


export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  places,
  pois,
  onSelectPlace,
  onSelectPoi,
}) => {
  const activePlaces = React.useMemo(() => places || pois || [], [places, pois]);
  const handleSelect = onSelectPlace || onSelectPoi || (() => {});

  const mapStyleMode = useMapStore((state) => state.mapStyleMode);
  const selectedPlaceId = useMapStore((state) => state.selectedPlaceId);
  const centerRegion = useMapStore((state) => state.centerRegion);
  const userLocation = useMapStore((state) => state.userLocation);

  const styleURL = MAP_STYLE_URLS[mapStyleMode];

  const webViewRef = React.useRef<React.ComponentRef<typeof WebView>>(null);

  const leafletState: LeafletMapState = React.useMemo(
    () => ({ places: activePlaces, selectedPlaceId, center: centerRegion, userLocation }),
    [activePlaces, selectedPlaceId, centerRegion, userLocation]
  );

  // Fallback OpenStreetMap / Leaflet (Expo Go via WebView, web via iframe)
  const leafletHtmlSource = React.useMemo(
    () => ({ html: buildLeafletHtml(mapStyleMode, leafletState) }),
    [mapStyleMode, leafletState]
  );

  const selectPlaceById = (id: string) => {
    const place = activePlaces.find((p) => p.id === id);
    if (place) handleSelect(place);
  };

  // Update WebView map markers & center position dynamically without reloading HTML
  React.useEffect(() => {
    if (!isMapLibreAvailable && webViewRef.current) {
      webViewRef.current.injectJavaScript(buildLeafletUpdateScript(leafletState));
    }
  }, [leafletState]);

  // Handle messages sent from WebView Leaflet map
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    const id = parseLeafletSelection(event.nativeEvent.data);
    if (id) selectPlaceById(id);
  };

  // Web : react-native-webview n'a pas d'implémentation, la carte Leaflet passe par une iframe.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container} testID="map-view-container">
        <LeafletWebFrame
          mapStyleMode={mapStyleMode}
          state={leafletState}
          onSelectPlaceId={selectPlaceById}
        />
      </View>
    );
  }

  // If MapLibre Native Module is available (native dev client build), render native MapLibre vector map
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

          {userLocation && (
            <MarkerComponent
              key="user-location-marker"
              id="user-location-marker"
              lngLat={[userLocation.longitude, userLocation.latitude]}
              coordinate={[userLocation.longitude, userLocation.latitude]}
            >
              <View
                style={styles.userMarkerContainer}
                accessibilityLabel="Votre position"
                accessibilityRole="image"
              >
                <View style={styles.userMarkerDot} />
              </View>
            </MarkerComponent>
          )}

          {activePlaces.map((place) => {
            const isSelected = selectedPlaceId === place.id;
            const emoji = CATEGORY_EMOJIS[place.category] || CATEGORY_EMOJIS.all;

            return (
              <MarkerComponent
                key={place.id}
                id={place.id}
                lngLat={[place.longitude, place.latitude]}
                coordinate={[place.longitude, place.latitude]}
              >
                <TouchableOpacity
                  style={[
                    styles.markerContainer,
                    isSelected && styles.markerSelected,
                  ]}
                  onPress={() => handleSelect(place)}
                  accessibilityLabel={`Sélectionner ${place.title}`}
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Text style={styles.markerEmoji}>{emoji}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText} numberOfLines={1}>
                        {place.title}
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

  return (
    <View style={styles.container} testID="map-view-container">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={leafletHtmlSource}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(buildLeafletUpdateScript(leafletState));
        }}
        testID="leaflet-webview-map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 20,
    borderWidth: 2,
    elevation: 5,
    height: 40,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    width: 40,
  },
  markerEmoji: {
    fontSize: 20,
  },
  markerSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderWidth: 2.5,
    transform: [{ scale: 1.25 }],
    zIndex: 999,
  },
  selectedBadge: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    bottom: -22,
    maxWidth: 120,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
  },
  selectedBadgeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  userMarkerContainer: {
    alignItems: 'center',
    backgroundColor: USER_MARKER_CONTAINER_BG,
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  userMarkerDot: {
    backgroundColor: USER_MARKER_DOT_BG,
    borderColor: colors.white,
    borderRadius: 6,
    borderWidth: 2,
    elevation: 3,
    height: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    width: 12,
  },
  webView: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
