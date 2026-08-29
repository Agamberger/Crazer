import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, typography } from '@/shared/constants/theme';
import { PlaceItem } from '../types/carte';
import { useMapStore, MAP_STYLE_URLS } from '../store/useMapStore';

// Safe dynamic resolution of MapLibre React Native for native & Expo Go compatibility
let MapLibreRN: unknown = null;
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
  places?: PlaceItem[];
  pois?: PlaceItem[];
  onSelectPlace?: (place: PlaceItem) => void;
  onSelectPoi?: (poi: PlaceItem) => void;
}

const USER_MARKER_CONTAINER_BG = 'rgba(59, 130, 246, 0.3)';
const USER_MARKER_DOT_BG = '#3B82F6';

const CATEGORY_EMOJIS: Record<string, string> = {
  resto: '🍕',
  bar: '🍸',
  activite: '🎯',
  nature: '🌲',
  culture: '🎨',
  all: '📍',
};

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

  const webViewRef = React.useRef<WebView>(null);

  // OpenStreetMap Leaflet Map via WebView for Expo Go & Web environments
  const leafletHtmlSource = React.useMemo(() => {
    const tileUrl =
      mapStyleMode === 'voyager'
        ? 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
        : mapStyleMode === 'outdoor'
        ? 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #121214; }
          .leaflet-control-attribution { font-size: 9px !important; background: rgba(0,0,0,0.6) !important; color: #aaa !important; }
          .custom-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 19px;
            background-color: #1E2028;
            border: 2px solid #FF6B35;
            font-size: 18px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            transition: transform 0.2s ease;
          }
          .custom-marker.selected {
            background-color: #FF6B35;
            border-color: #FFFFFF;
            transform: scale(1.25);
            z-index: 9999 !important;
          }
          .user-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border-radius: 7px;
            background-color: #3B82F6;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.3), 0 2px 5px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${centerRegion.latitude}, ${centerRegion.longitude}], ${centerRegion.zoomLevel});
          var markersLayer = L.layerGroup().addTo(map);
          var userLayer = L.layerGroup().addTo(map);

          L.tileLayer('${tileUrl}', {
            maxZoom: 19,
            attribution: '© OpenStreetMap © CARTO'
          }).addTo(map);

          function updateMapState(placesData, selectedId, emojis, center, userLoc) {
            if (center && center.latitude && center.longitude) {
              map.flyTo([center.latitude, center.longitude], center.zoomLevel || map.getZoom());
            }
            userLayer.clearLayers();
            if (userLoc && userLoc.latitude && userLoc.longitude) {
              var userIcon = L.divIcon({
                className: '',
                html: '<div class="user-marker" title="Votre position"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });
              L.marker([userLoc.latitude, userLoc.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(userLayer);
            }
            markersLayer.clearLayers();
            (placesData || []).forEach(function(place) {
              var isSelected = place.id === selectedId;
              var emoji = emojis[place.category] || '📍';
              
              var icon = L.divIcon({
                className: '',
                html: '<div class="custom-marker ' + (isSelected ? 'selected' : '') + '">' + emoji + '</div>',
                iconSize: [38, 38],
                iconAnchor: [19, 19]
              });

              var marker = L.marker([place.latitude, place.longitude], { icon: icon }).addTo(markersLayer);
              marker.on('click', function() {
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_PLACE', id: place.id }));
                }
              });
            });
          }

          updateMapState(${JSON.stringify(activePlaces)}, ${JSON.stringify(selectedPlaceId)}, ${JSON.stringify(CATEGORY_EMOJIS)}, ${JSON.stringify(centerRegion)}, ${JSON.stringify(userLocation)});
        </script>
      </body>
      </html>
    `;

    return { html };
  }, [activePlaces, centerRegion, mapStyleMode, selectedPlaceId, userLocation]);

  // Update WebView map markers & center position dynamically without reloading HTML
  React.useEffect(() => {
    if (!isMapLibreAvailable && webViewRef.current) {
      const js = `
        if (typeof updateMapState === 'function') {
          updateMapState(${JSON.stringify(activePlaces)}, ${JSON.stringify(selectedPlaceId)}, ${JSON.stringify(CATEGORY_EMOJIS)}, ${JSON.stringify(centerRegion)}, ${JSON.stringify(userLocation)});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  }, [activePlaces, centerRegion, selectedPlaceId, userLocation]);

  // Handle messages sent from WebView Leaflet map
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_PLACE' || data.type === 'SELECT_POI') {
        const place = activePlaces.find((p) => p.id === data.id);
        if (place) {
          handleSelect(place);
        }
      }
    } catch {
      // Ignored
    }
  };

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
          if (webViewRef.current) {
            const js = `
              if (typeof updateMapState === 'function') {
                updateMapState(${JSON.stringify(activePlaces)}, ${JSON.stringify(selectedPlaceId)}, ${JSON.stringify(CATEGORY_EMOJIS)}, ${JSON.stringify(centerRegion)}, ${JSON.stringify(userLocation)});
              }
              true;
            `;
            webViewRef.current.injectJavaScript(js);
          }
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
