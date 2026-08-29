import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/shared/constants/theme';
import {
  MapViewComponent,
  MapHeaderSearch,
  PlaceDetailCard,
  AddPlaceToOutingModal,
  useMapStore,
  usePlaces,
  PlaceItem,
} from '@/features/carte';

export default function CarteScreen() {
  const insets = useSafeAreaInsets();
  const selectedPlaceId = useMapStore((state) => state.selectedPlaceId);
  const places = useMapStore((state) => state.places);
  const getFilteredPlaces = useMapStore((state) => state.getFilteredPlaces);
  const setSelectedPlaceId = useMapStore((state) => state.setSelectedPlaceId);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);

  const [modalPlace, setModalPlace] = useState<PlaceItem | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

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

  const filteredPlaces = getFilteredPlaces();
  const selectedPlace = places.find((p) => p.id === selectedPlaceId) || null;

  const handleSelectPlace = (place: PlaceItem) => {
    setSelectedPlaceId(place.id);
    setCenterRegion({
      latitude: place.latitude,
      longitude: place.longitude,
      zoomLevel: 14,
    });
  };

  const handleAddToOuting = (place: PlaceItem) => {
    setModalPlace(place);
    setIsAddModalVisible(true);
  };

  const handleGetDirections = (place: PlaceItem) => {
    Alert.alert(
      'Itinéraire',
      `Calcul de l'itinéraire vers ${place.address}...`
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
        places={filteredPlaces}
        onSelectPlace={handleSelectPlace}
      />

      {/* Header Search & Category Filter Overlay positioned taking safe area into account */}
      <Animated.View
        style={[
          styles.headerOverlay,
          {
            top: insets.top + spacing.xs,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <MapHeaderSearch />
      </Animated.View>

      {/* Detail Card Overlay at Bottom */}
      {selectedPlace && (
        <View style={styles.bottomCardOverlay}>
          <PlaceDetailCard
            place={selectedPlace}
            onClose={() => setSelectedPlaceId(null)}
            onAddToOuting={handleAddToOuting}
            onGetDirections={handleGetDirections}
            expandAnim={expandAnim}
          />
        </View>
      )}

      {/* Add Place to Outing Modal */}
      <AddPlaceToOutingModal
        visible={isAddModalVisible}
        place={modalPlace}
        onClose={() => {
          setIsAddModalVisible(false);
          setModalPlace(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomCardOverlay: {
    bottom: spacing.md,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  container: {
    flex: 1,
  },
  headerOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 10,
  },
});
