import React, { useState, useEffect, useRef } from 'react';
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
import { PoiCategory, MapCategoryFilter, PoiItem } from '../types/carte';
import { useMapStore } from '../store/useMapStore';
import {
  fetchGooglePlaceAutocomplete,
  fetchGooglePlaceDetails,
  googlePlaceDetailsToPoiItem,
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
  onSearchChange?: (text: string) => void;
  onSelectCategory?: (category: PoiCategory) => void;
  onSelectGooglePlace?: (poi: PoiItem) => void;
}

export const MapHeaderSearch: React.FC<MapHeaderSearchProps> = ({
  onSearchChange,
  onSelectCategory,
  onSelectGooglePlace,
}) => {
  const searchQuery = useMapStore((state) => state.searchQuery);
  const selectedCategory = useMapStore((state) => state.selectedCategory);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const setSelectedCategory = useMapStore((state) => state.setSelectedCategory);
  const setPois = useMapStore((state) => state.setPois);
  const pois = useMapStore((state) => state.pois);
  const setSelectedPoiId = useMapStore((state) => state.setSelectedPoiId);
  const setCenterRegion = useMapStore((state) => state.setCenterRegion);

  const [predictions, setPredictions] = useState<GoogleAutocompletePrediction[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutocompleteRef = useRef<boolean>(false);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (skipAutocompleteRef.current) {
      skipAutocompleteRef.current = false;
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchGooglePlaceAutocomplete(searchQuery);
        setPredictions(results);
      } catch (err) {
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (onSearchChange) onSearchChange(text);
  };

  const handleCategoryPress = (category: PoiCategory) => {
    Keyboard.dismiss();
    setPredictions([]);
    setSelectedCategory(category);
    if (onSelectCategory) onSelectCategory(category);
  };

  const handleSelectPrediction = async (prediction: GoogleAutocompletePrediction) => {
    Keyboard.dismiss();
    skipAutocompleteRef.current = true;
    setPredictions([]);
    setIsLoadingDetails(true);
    setSearchQuery(prediction.structured_formatting.main_text);

    try {
      const details = await fetchGooglePlaceDetails(prediction.place_id);
      if (details) {
        const poi = googlePlaceDetailsToPoiItem(details);

        // Ajouter le lieu aux POIs du store s'il n'existe pas déjà
        const exists = pois.some((p) => p.id === poi.id);
        if (!exists) {
          setPois([...pois, poi]);
        }

        // Sélectionner et centrer la carte sur le lieu
        setSelectedPoiId(poi.id);
        setCenterRegion({
          latitude: poi.latitude,
          longitude: poi.longitude,
          zoomLevel: 15,
        });

        if (onSelectGooglePlace) {
          onSelectGooglePlace(poi);
        }
      }
    } catch (err) {
      console.error('[MapHeaderSearch] Erreur lors de la sélection du lieu Google:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lieu, un bar, une activité..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={() => Keyboard.dismiss()}
            returnKeyType="search"
            accessibilityLabel="Barre de recherche de lieux"
          />
          {isSearching || isLoadingDetails ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.loader}
              testID="autocomplete-loader"
            />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                handleSearchChange('');
                setPredictions([]);
              }}
              accessibilityLabel="Effacer la recherche"
              accessibilityRole="button"
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Liste déroulante des prédictions Autocomplete */}
        {predictions.length > 0 && (
          <View style={styles.dropdownContainer} testID="autocomplete-dropdown">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.dropdownList}
            >
              {predictions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectPrediction(item)}
                  accessibilityLabel={`Sélectionner ${item.structured_formatting.main_text}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.itemIcon}>📍</Text>
                  <View style={styles.itemTextContainer}>
                    <Text style={styles.itemMainText} numberOfLines={1}>
                      {item.structured_formatting.main_text}
                    </Text>
                    {item.structured_formatting.secondary_text && (
                      <Text style={styles.itemSecondaryText} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
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
              onPress={() => handleCategoryPress(cat.id)}
              accessibilityLabel={`Filtrer par ${cat.label}`}
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
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.transparent,
  },
  searchBarContainer: {
    position: 'relative',
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    fontSize: typography.fontSizes.md,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.regular,
  },
  loader: {
    marginRight: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearButtonText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 240,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownList: {
    paddingVertical: spacing.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    fontSize: typography.fontSizes.md,
    marginRight: spacing.sm,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemMainText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  itemSecondaryText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  categoriesContainer: {
    paddingVertical: spacing.sm,
    gap: spacing.xs + 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  categoryIcon: {
    fontSize: typography.fontSizes.sm,
    marginRight: spacing.xs,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  categoryTextSelected: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
});
