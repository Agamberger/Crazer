import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography } from '@/shared/constants/theme';
import { PlaceItem } from '../types/carte';
import { CATEGORY_EMOJIS } from '../utils/leafletMap';
import { MapLibreMarker } from '../utils/mapLibreModule';

export interface NativePlaceMarkerProps {
  place: PlaceItem;
  isSelected: boolean;
  onSelect: (place: PlaceItem) => void;
}

/** Category emoji marker of a place on the native MapLibre map, with its name when selected. */
export const NativePlaceMarker: React.FC<NativePlaceMarkerProps> = ({
  place,
  isSelected,
  onSelect,
}) => {
  const emoji = CATEGORY_EMOJIS[place.category] || CATEGORY_EMOJIS.all;

  return (
    <MapLibreMarker
      id={place.id}
      lngLat={[place.longitude, place.latitude]}
      coordinate={[place.longitude, place.latitude]}
    >
      <TouchableOpacity
        style={[styles.markerContainer, isSelected && styles.markerSelected]}
        onPress={() => onSelect(place)}
        accessibilityLabel={`Sélectionner ${place.title}`}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <Text style={styles.markerEmoji}>{emoji}</Text>
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText} numberOfLines={1}>
              {place.title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </MapLibreMarker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 20,
    borderWidth: 2,
    elevation: 5,
    height: 40,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    width: 40,
  },
  markerEmoji: {
    fontSize: 20,
  },
  markerSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderWidth: 2.5,
    transform: [{ scale: 1.25 }],
    zIndex: 999,
  },
  selectedBadge: {
    backgroundColor: colors.surfaceDark,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    bottom: -22,
    maxWidth: 120,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
  },
  selectedBadgeText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
});
