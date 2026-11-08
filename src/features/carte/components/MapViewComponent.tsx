import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/shared/constants/theme';
import { PlaceItem } from '../types/carte';
import { useMapStore, MAP_STYLE_URLS } from '../store/useMapStore';
import {
  buildLeafletHtml,
  buildLeafletUpdateScript,
  LeafletMapState,
  MapVisibleArea,
  parseLeafletRegion,
  parseLeafletSelection,
} from '../utils/leafletMap';
import { isMapLibreAvailable } from '../utils/mapLibreModule';
import { LeafletWebFrame } from './LeafletWebFrame';
import { NativeMapLibreView } from './NativeMapLibreView';

export interface MapViewComponentProps {
  places?: PlaceItem[];
  pois?: PlaceItem[];
  onSelectPlace?: (place: PlaceItem) => void;
  onSelectPoi?: (poi: PlaceItem) => void;
  /** Zone visible de la carte Leaflet (chargement, déplacement, zoom), pour y charger les lieux. */
  onRegionChange?: (area: MapVisibleArea) => void;
}

export const MapViewComponent: React.FC<MapViewComponentProps> = ({
  places,
  pois,
  onSelectPlace,
  onSelectPoi,
  onRegionChange,
}) => {
  const activePlaces = React.useMemo(() => places || pois || [], [places, pois]);
  const handleSelect = onSelectPlace || onSelectPoi || (() => {});

  const mapStyleMode = useMapStore((state) => state.mapStyleMode);
  const selectedPlaceId = useMapStore((state) => state.selectedPlaceId);
  const centerRegion = useMapStore((state) => state.centerRegion);
  const centerVersion = useMapStore((state) => state.centerVersion);
  const userLocation = useMapStore((state) => state.userLocation);

  const styleURL = MAP_STYLE_URLS[mapStyleMode];

  const webViewRef = React.useRef<React.ComponentRef<typeof WebView>>(null);

  const leafletState: LeafletMapState = React.useMemo(
    () => ({
      places: activePlaces,
      selectedPlaceId,
      center: centerRegion,
      centerVersion,
      userLocation,
    }),
    [activePlaces, selectedPlaceId, centerRegion, centerVersion, userLocation],
  );
  const leafletStateRef = React.useRef(leafletState);
  leafletStateRef.current = leafletState;

  // Fallback OpenStreetMap / Leaflet (Expo Go via WebView, web via iframe).
  // Le HTML n'est reconstruit que si le style change : sinon chaque nouveau lieu rechargeait
  // toute la carte et annulait le déplacement de l'utilisateur. Le reste passe par injectJavaScript.
  const leafletHtmlSource = React.useMemo(
    () => ({ html: buildLeafletHtml(mapStyleMode, leafletStateRef.current) }),
    [mapStyleMode],
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
    if (id) {
      selectPlaceById(id);
      return;
    }
    const area = parseLeafletRegion(event.nativeEvent.data);
    if (area) onRegionChange?.(area);
  };

  // Web : react-native-webview n'a pas d'implémentation, la carte Leaflet passe par une iframe.
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container} testID="map-view-container">
        <LeafletWebFrame
          mapStyleMode={mapStyleMode}
          state={leafletState}
          onSelectPlaceId={selectPlaceById}
          onRegionChange={onRegionChange}
        />
      </View>
    );
  }

  // If MapLibre Native Module is available (native dev client build), render native MapLibre vector map
  if (isMapLibreAvailable) {
    return (
      <View style={styles.container} testID="map-view-container">
        <NativeMapLibreView
          styleURL={styleURL}
          center={centerRegion}
          userLocation={userLocation}
          places={activePlaces}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelect}
        />
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
          webViewRef.current?.injectJavaScript(buildLeafletUpdateScript(leafletStateRef.current));
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
  webView: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
