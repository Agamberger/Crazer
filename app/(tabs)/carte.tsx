import React from 'react';
import { View, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { colors, spacing } from '@/shared/constants/theme';
import {
  MapViewComponent,
  MapHeaderSearch,
  PoiDetailCard,
  StyleSelector,
  useMapStore,
  PoiItem,
} from '@/features/carte';

export default function CarteScreen() {
  const selectedPoiId = useMapStore((state) => state.selectedPoiId);
  const pois = useMapStore((state) => state.pois);
  const getFilteredPois = useMapStore((state) => state.getFilteredPois);
  const setSelectedPoiId = useMapStore((state) => state.setSelectedPoiId);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);

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
      'Ajouter à une sortie',
      `"${poi.title}" a été préparé pour être ajouté à votre prochaine sortie !`,
      [{ text: 'Super !', style: 'default' }]
    );
  };

  const handleGetDirections = (poi: PoiItem) => {
    Alert.alert(
      'Itinéraire',
      `Calcul de l'itinéraire vers ${poi.address}...`,
      [{ text: 'C\'est parti', style: 'default' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Search & Category Filter */}
        <View style={styles.headerOverlay}>
          <MapHeaderSearch />
        </View>

        {/* Map View */}
        <MapViewComponent
          pois={filteredPois}
          onSelectPoi={handleSelectPoi}
        />

        {/* Style Selector Widget Floating at Top Right / Center */}
        <View style={styles.styleSelectorOverlay}>
          <StyleSelector />
        </View>

        {/* Detail Card Overlay at Bottom */}
        {selectedPoi && (
          <View style={styles.bottomCardOverlay}>
            <PoiDetailCard
              poi={selectedPoi}
              onClose={() => setSelectedPoiId(null)}
              onAddToOuting={handleAddToOuting}
              onGetDirections={handleGetDirections}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  headerOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  styleSelectorOverlay: {
    position: 'absolute',
    top: 120,
    right: spacing.md,
    zIndex: 15,
  },
  bottomCardOverlay: {
    position: 'absolute',
    bottom: spacing.xs,
    left: 0,
    right: 0,
    zIndex: 30,
  },
});
