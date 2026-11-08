import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SearchBar } from '@/shared/components';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { PlaceCategoryFilter, PlaceItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';
import { usePlaceAutocomplete } from '../hooks/usePlaceAutocomplete';
import {
  googlePlaceDetailsToPlaceItem,
  GooglePlaceDetailsResult,
} from '../services/googlePlacesService';
import { CategoryFilterChips } from './CategoryFilterChips';
import { PlacePredictionsDropdown } from './PlacePredictionsDropdown';

export interface MapHeaderSearchProps {
  onSelectPlace?: (place: PlaceItem) => void;
  onSelectGooglePlace?: (place: PlaceItem) => void;
}

export const MapHeaderSearch: React.FC<MapHeaderSearchProps> = ({
  onSelectPlace,
  onSelectGooglePlace,
}) => {
  const selectedCategory = useMapStore((state) => state.selectedCategory);
  const setSelectedCategory = useMapStore((state) => state.setSelectedCategory);
  const setSelectedPlaceId = useMapStore((state) => state.setSelectedPlaceId);
  const places = useMapStore((state) => state.places);
  const setPlaces = useMapStore((state) => state.setPlaces);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);

  const showPlaceDetails = (details: GooglePlaceDetailsResult) => {
    const newPlace = googlePlaceDetailsToPlaceItem(details);

    // Si le lieu n'est pas déjà dans le store, on l'ajoute
    if (!places.some((p) => p.id === newPlace.id)) {
      setPlaces([newPlace, ...places]);
    }

    // Sélectionner et centrer la carte
    setSelectedPlaceId(newPlace.id);
    setCenterRegion({
      latitude: newPlace.latitude,
      longitude: newPlace.longitude,
      zoomLevel: 15,
    });

    if (onSelectPlace) {
      onSelectPlace(newPlace);
    }
    if (onSelectGooglePlace) {
      onSelectGooglePlace(newPlace);
    }
  };

  const {
    inputRef,
    searchQuery,
    predictions,
    isSearchingGoogle,
    isDropdownVisible,
    handleFocus,
    handleChangeText,
    handleClear,
    handleSelectPrediction,
  } = usePlaceAutocomplete(showPlaceDetails);

  const handleSelectCategory = (cat: PlaceCategoryFilter) => {
    setSelectedCategory(cat);
  };

  return (
    <View style={styles.container}>
      <SearchBar
        ref={inputRef}
        value={searchQuery}
        onChangeText={handleChangeText}
        onClear={handleClear}
        onFocus={handleFocus}
        loading={isSearchingGoogle}
        placeholder="Rechercher un lieu, resto, bar..."
        accessibilityLabel="Barre de recherche de lieux"
        containerStyle={styles.searchBar}
        style={styles.searchInput}
      />

      {isDropdownVisible ? (
        <PlacePredictionsDropdown
          predictions={predictions}
          onSelectPrediction={handleSelectPrediction}
        />
      ) : null}

      <CategoryFilterChips
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },

  searchBar: {
    backgroundColor: colors.surface,
    elevation: 4,
    height: 46,
    marginHorizontal: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  searchInput: {
    fontSize: typography.fontSizes.sm,
  },
});
