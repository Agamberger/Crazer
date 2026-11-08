import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MapViewComponent,
  MapHeaderSearch,
  PlaceDetailCard,
  AddPlaceToOutingModal,
  TargetOutingBanner,
  useMapStore,
  usePlaces,
  PlaceItem,
  ensurePlaceExists,
} from '@/features/carte';
import { useAuth } from '@/features/auth';
import { useOutingsStore } from '@/features/outings';
import { spacing } from '@/shared/constants/theme';
import { toast } from '@/shared/store/useToastStore';

export default function CarteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const selectedPlaceId = useMapStore((state) => state.selectedPlaceId);
  const places = useMapStore((state) => state.places);
  const getFilteredPlaces = useMapStore((state) => state.getFilteredPlaces);
  const setSelectedPlaceId = useMapStore((state) => state.setSelectedPlaceId);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);
  const targetOutingId = useMapStore((state) => state.targetOutingId);
  const setTargetOutingId = useMapStore((state) => state.setTargetOutingId);
  const outings = useOutingsStore((state) => state.outings);

  const [modalPlace, setModalPlace] = useState<PlaceItem | null>(null);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const { requestLocation, loadNearby, loadVisibleArea } = usePlaces();
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
  const targetOuting = targetOutingId ? outings.find((o) => o.id === targetOutingId) || null : null;

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

  /** « Nouvelle sortie » : le lieu est enregistré, puis l'assistant s'ouvre autour de lui. */
  const handleCreateOutingWithPlace = async (place: PlaceItem) => {
    const placeId = await ensurePlaceExists(place, user?.id);
    router.push({ pathname: '/outing/create', params: { placeId, placeName: place.title } });
  };

  const handleAddSuccess = () => {
    if (targetOutingId) {
      setTargetOutingId(null);
      router.push('/(tabs)/sorties');
    }
  };

  const handleGetDirections = (place: PlaceItem) => {
    toast.info(`Calcul de l'itinéraire vers ${place.address}...`, { title: 'Itinéraire' });
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
        onRegionChange={loadVisibleArea}
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

        {/* Targeted Outing Banner */}
        {targetOuting && (
          <TargetOutingBanner
            outingTitle={targetOuting.title}
            onClear={() => setTargetOutingId(null)}
          />
        )}
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
            hasTargetOuting={!!targetOutingId}
            targetOutingTitle={targetOuting?.title}
          />
        </View>
      )}

      {/* Add Place to Outing Modal */}
      <AddPlaceToOutingModal
        visible={isAddModalVisible}
        place={modalPlace}
        initialOuting={targetOuting}
        targetOutingId={targetOutingId}
        onClose={() => {
          setIsAddModalVisible(false);
          setModalPlace(null);
        }}
        onSuccess={handleAddSuccess}
        onCreateNewOuting={handleCreateOutingWithPlace}
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
