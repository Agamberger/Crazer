import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, Chip, ListItem, SearchBar } from '@/shared/components';
import { colors, radii, spacing, typography } from '@/shared/constants/theme';
import { PlaceCategoryFilter, MapCategoryFilter, PlaceItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';
import {
  fetchGooglePlaceAutocomplete,
  fetchGooglePlaceDetails,
  googlePlaceDetailsToPlaceItem,
  GoogleAutocompletePrediction,
} from '../services/googlePlacesService';

const CATEGORIES: MapCategoryFilter[] = [
  { id: 'all', label: 'Tous', iconName: '🌟' },
  { id: 'resto', label: 'Restos', iconName: '🍕' },
  { id: 'bar', label: 'Bars', iconName: '🍸' },
  { id: 'activite', label: 'Activités', iconName: '🎯' },
  { id: 'nature', label: 'Outdoor', iconName: '🌲' },
  { id: 'culture', label: 'Culture', iconName: '🎨' },
];

export interface MapHeaderSearchProps {
  onSelectPlace?: (place: PlaceItem) => void;
  onSelectGooglePlace?: (place: PlaceItem) => void;
}

export const MapHeaderSearch: React.FC<MapHeaderSearchProps> = ({
  onSelectPlace,
  onSelectGooglePlace,
}) => {
  const searchQuery = useMapStore((state) => state.searchQuery);
  const selectedCategory = useMapStore((state) => state.selectedCategory);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const setSelectedCategory = useMapStore((state) => state.setSelectedCategory);
  const setSelectedPlaceId = useMapStore((state) => state.setSelectedPlaceId);
  const places = useMapStore((state) => state.places);
  const setPlaces = useMapStore((state) => state.setPlaces);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);

  const [predictions, setPredictions] = useState<GoogleAutocompletePrediction[]>([]);
  const [isSearchingGoogle, setIsSearchingGoogle] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);

  // Gérer l'autocomplétion Google Places au fil de la frappe
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (justSelectedRef.current) {
      return;
    }

    if (searchQuery.trim().length >= 2 && isFocused) {
      debounceTimerRef.current = setTimeout(async () => {
        setIsSearchingGoogle(true);
        try {
          const results = await fetchGooglePlaceAutocomplete(searchQuery);
          setPredictions(results);
          if (isFocused && !justSelectedRef.current) {
            setIsDropdownVisible(results.length > 0);
          }
        } catch {
          setPredictions([]);
        } finally {
          setIsSearchingGoogle(false);
        }
      }, 350);
    } else if (searchQuery.trim().length < 2) {
      setPredictions([]);
      setIsDropdownVisible(false);
      setIsSearchingGoogle(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, isFocused]);

  const handleSelectCategory = (cat: PlaceCategoryFilter) => {
    setSelectedCategory(cat);
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    justSelectedRef.current = false;
    if (predictions.length > 0 && searchQuery.trim().length >= 2) {
      setIsDropdownVisible(true);
    } else if (searchQuery.trim().length >= 2) {
      fetchGooglePlaceAutocomplete(searchQuery)
        .then((results) => {
          setPredictions(results);
          if (!justSelectedRef.current) {
            setIsDropdownVisible(results.length > 0);
          }
        })
        .catch(() => {});
    }
  }, [predictions.length, searchQuery]);

  const handleSelectPrediction = async (prediction: GoogleAutocompletePrediction) => {
    justSelectedRef.current = true;
    setIsFocused(false);
    setIsDropdownVisible(false);
    inputRef.current?.blur();
    Keyboard.dismiss();

    const selectedName = prediction.structured_formatting?.main_text || prediction.description;
    setSearchQuery(selectedName);

    try {
      setIsSearchingGoogle(true);
      const details = await fetchGooglePlaceDetails(prediction.place_id);
      if (details) {
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
      }
    } catch {
      // Ignorer l'erreur silencieusement ou laisser le store gérer
    } finally {
      setIsSearchingGoogle(false);
    }
  };

  const handleChangeText = (text: string) => {
    justSelectedRef.current = false;
    setIsFocused(true);
    setSearchQuery(text);
  };

  const handleClear = () => {
    setPredictions([]);
    setIsDropdownVisible(false);
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

      {isDropdownVisible && predictions.length > 0 ? (
        <View style={styles.dropdownContainer} testID="autocomplete-dropdown">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {predictions.map((item) => {
              const mainText = item.structured_formatting?.main_text || item.description;
              return (
                <ListItem
                  key={item.place_id}
                  title={mainText}
                  subtitle={item.structured_formatting?.secondary_text || undefined}
                  left={<AppText>📍</AppText>}
                  showChevron={false}
                  onPress={() => handleSelectPrediction(item)}
                  accessibilityLabel={`Sélectionner ${mainText}`}
                  style={styles.dropdownItem}
                />
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        keyboardShouldPersistTaps="handled"
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.label}
            emoji={cat.iconName}
            selected={selectedCategory === cat.id}
            onPress={() => handleSelectCategory(cat.id)}
            accessibilityLabel={`Filtrer par catégorie ${cat.label}`}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  categoriesContainer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  container: {
    width: '100%',
    zIndex: 10,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md + 2,
    borderWidth: 1,
    elevation: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    maxHeight: 220,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 20,
  },
  dropdownItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 0,
    paddingHorizontal: spacing.md,
  },
  dropdownScroll: {
    maxHeight: 220,
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
