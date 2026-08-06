import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, StatusBar, Animated } from 'react-native';
import { colors, spacing } from '@/shared/constants/theme';
import {
  MapViewComponent,
  MapHeaderSearch,
  PoiDetailCard,
  useMapStore,
  usePlaces,
  PoiItem,
} from '@/features/carte';

export default function CarteScreen() {
  const selectedPoiId = useMapStore((state) => state.selectedPoiId);
  const pois = useMapStore((state) => state.pois);
  const getFilteredPois = useMapStore((state) => state.getFilteredPois);
  const setSelectedPoiId = useMapStore((state) => state.setSelectedPoiId);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);

  const { requestLocation, loadNearby } = usePlaces();
  const isInitialized = React.useRef(false);

  const expandAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initMapData = async () => {
      const coords = await requestLocation();
      if (coords) {
        await loadNearby(coords.latitude, coords.longitude);
      } else {
        await loadNearby();
      }
    };
    initMapData();
  }, [requestLocation, loadNearby]);

  const filteredPois = getFilteredPois();
  const selectedPoi = pois.find((p) => p.id === selectedPoiId) || null;

  const handleSelectPoi = (poi: PoiItem) => {
    setSelectedPoiId(poi.id);
    setCenterRegion({
      latitude: poi.latitude,
      longitude: poi.longitude,
      zoomLevel: 14,
    });
  };

  const handleAddToOuting = (poi: PoiItem) => {
    Alert.alert(
      'Ajouter à la sortie',
      `Le lieu "${poi.title}" a été préparé pour votre sortie !`
    );
  };

  const handleGetDirections = (poi: PoiItem) => {
    Alert.alert(
      'Itinéraire',
      `Calcul de l'itinéraire vers ${poi.address}...`
    );
  };

  const headerTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -35],
  });

  return (
    <View style={styles.container}>
      {/* Map View spanning 100% full screen edge-to-edge */}
      <MapViewComponent
        pois={filteredPois}
        onSelectPoi={handleSelectPoi}
      />

      {/* Header Search & Category Filter Overlay positioned at very top */}
      <Animated.View
        style={[
          styles.headerOverlay,
          { transform: [{ translateY: headerTranslateY }] },
        ]}
        pointerEvents="box-none"
      >
        <MapHeaderSearch />
      </Animated.View>

      {/* Detail Card Overlay at Bottom */}
      {selectedPoi && (
        <View style={styles.bottomCardOverlay}>
          <PoiDetailCard
            poi={selectedPoi}
            onClose={() => setSelectedPoiId(null)}
            onAddToOuting={handleAddToOuting}
            onGetDirections={handleGetDirections}
            expandAnim={expandAnim}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  headerOverlay: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 20) + 4,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  bottomCardOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
    zIndex: 40,
  },
});
