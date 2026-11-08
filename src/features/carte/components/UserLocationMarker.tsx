import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/shared/constants/theme';
import { MapLibreMarker } from '../utils/mapLibreModule';

export interface UserLocationMarkerProps {
  location: { latitude: number; longitude: number };
}

const USER_MARKER_CONTAINER_BG = 'rgba(59, 130, 246, 0.3)';
const USER_MARKER_DOT_BG = '#3B82F6';

/** Blue dot showing the user's position on the native MapLibre map. */
export const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ location }) => (
  <MapLibreMarker
    id="user-location-marker"
    lngLat={[location.longitude, location.latitude]}
    coordinate={[location.longitude, location.latitude]}
  >
    <View
      style={styles.userMarkerContainer}
      accessibilityLabel="Votre position"
      accessibilityRole="image"
    >
      <View style={styles.userMarkerDot} />
    </View>
  </MapLibreMarker>
);

const styles = StyleSheet.create({
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
});
