import React from 'react';
import { StyleSheet } from 'react-native';
import { MapRegion, PlaceItem } from '../types/carte';
import { MapLibreCamera, MapLibreMap } from '../utils/mapLibreModule';
import { NativePlaceMarker } from './NativePlaceMarker';
import { UserLocationMarker } from './UserLocationMarker';

export interface NativeMapLibreViewProps {
  styleURL: string;
  center: MapRegion;
  userLocation: { latitude: number; longitude: number } | null;
  places: PlaceItem[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: PlaceItem) => void;
}

/** Native MapLibre vector map (dev client builds), with the user position and place markers. */
export const NativeMapLibreView: React.FC<NativeMapLibreViewProps> = ({
  styleURL,
  center,
  userLocation,
  places,
  selectedPlaceId,
  onSelectPlace,
}) => (
  <MapLibreMap
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
    <MapLibreCamera
      center={[center.longitude, center.latitude]}
      centerCoordinate={[center.longitude, center.latitude]}
      zoom={center.zoomLevel}
      zoomLevel={center.zoomLevel}
      animationMode="flyTo"
      animationDuration={1000}
    />

    {userLocation && <UserLocationMarker key="user-location-marker" location={userLocation} />}

    {places.map((place) => (
      <NativePlaceMarker
        key={place.id}
        place={place}
        isSelected={selectedPlaceId === place.id}
        onSelect={onSelectPlace}
      />
    ))}
  </MapLibreMap>
);

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
