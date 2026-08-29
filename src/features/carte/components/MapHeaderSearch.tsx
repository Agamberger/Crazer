import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
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

  const inputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  return (
    <View style={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Rechercher un lieu, resto, bar..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onFocus={handleFocus}
          onChangeText={(text) => {
            justSelectedRef.current = false;
            setIsFocused(true);
            setSearchQuery(text);
          }}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Barre de recherche de lieux"
        />
        {isSearchingGoogle ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
        ) : searchQuery.length > 0 ? (
          <TouchableOpacity
            onPress={() => {
              justSelectedRef.current = false;
              setSearchQuery('');
              setPredictions([]);
              setIsDropdownVisible(false);
            }}
            accessibilityLabel="Effacer la recherche"
          >
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Autocomplete Dropdown List */}
      {isDropdownVisible && predictions.length > 0 && (
        <View style={styles.dropdownContainer} testID="autocomplete-dropdown">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {predictions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.dropdownItem}
                onPress={() => handleSelectPrediction(item)}
                accessibilityLabel={`Sélectionner ${item.structured_formatting?.main_text || item.description}`}
                accessibilityRole="button"
              >
                <Text style={styles.dropdownItemIcon}>📍</Text>
                <View style={styles.dropdownItemTextContainer}>
                  <Text style={styles.dropdownMainText} numberOfLines={1}>
                    {item.structured_formatting?.main_text || item.description}
                  </Text>
                  {item.structured_formatting?.secondary_text ? (
                    <Text style={styles.dropdownSecondaryText} numberOfLines={1}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category Pills Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
        keyboardShouldPersistTaps="handled"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => handleSelectCategory(cat.id)}
              accessibilityLabel={`Filtrer par catégorie ${cat.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.categoryIcon}>{cat.iconName}</Text>
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  categoryChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  categoryTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  clearIcon: {
    color: colors.textMuted,
    fontSize: 14,
    paddingHorizontal: spacing.xs,
  },
  container: {
    width: '100%',
    zIndex: 10,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
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
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 0.5,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dropdownItemIcon: {
    fontSize: 16,
  },
  dropdownItemTextContainer: {
    flex: 1,
  },
  dropdownMainText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownSecondaryText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.sm,
    height: '100%',
    paddingVertical: 0,
  },
  searchBarContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 46,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  searchIcon: {
    fontSize: 16,
  },
  spinner: {
    marginRight: spacing.xs,
  },
});
