import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Animated, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import {
  MapViewComponent,
  MapHeaderSearch,
  PlaceDetailCard,
  AddPlaceToOutingModal,
  useMapStore,
  usePlaces,
  PlaceItem,
} from '@/features/carte';
import { useOutingsStore } from '@/features/outings';

export default function CarteScreen() {
  const router = useRouter();
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

  const handleAddSuccess = () => {
    if (targetOutingId) {
      setTargetOutingId(null);
      router.push('/(tabs)');
    }
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

        {/* Targeted Outing Banner */}
        {targetOuting && (
          <View style={styles.targetBanner} testID="target-outing-banner">
            <View style={styles.targetBannerContent}>
              <Text style={styles.targetBannerLabel}>🎯 Ajout à la sortie</Text>
              <Text style={styles.targetBannerTitle} numberOfLines={1}>
                {targetOuting.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setTargetOutingId(null)}
              style={styles.targetBannerClose}
              testID="btn-clear-target-outing"
              accessibilityLabel="Quitter le mode ajout"
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
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
  targetBanner: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  targetBannerClose: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 3,
  },
  targetBannerContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  targetBannerLabel: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  targetBannerTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});
