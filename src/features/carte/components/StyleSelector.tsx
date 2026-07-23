import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { MapStyleMode } from '../types/carte';
import { useMapStore } from '../store/useMapStore';

const MAP_STYLES: { id: MapStyleMode; label: string; icon: string }[] = [
  { id: 'dark', label: 'Sombre', icon: '🌙' },
  { id: 'voyager', label: 'Voyager', icon: '☀️' },
  { id: 'outdoor', label: 'Positron', icon: '🧭' },
];

export const StyleSelector: React.FC = () => {
  const mapStyleMode = useMapStore((state) => state.mapStyleMode);
  const setMapStyleMode = useMapStore((state) => state.setMapStyleMode);

  return (
    <View style={styles.container} testID="style-selector">
      {MAP_STYLES.map((styleItem) => {
        const isSelected = mapStyleMode === styleItem.id;
        return (
          <TouchableOpacity
            key={styleItem.id}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => setMapStyleMode(styleItem.id)}
            accessibilityLabel={`Changer le style de carte en mode ${styleItem.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={styles.icon}>{styleItem.icon}</Text>
            <Text
              style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}
            >
              {styleItem.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: 12,
    gap: 4,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
  },
  icon: {
    fontSize: typography.fontSizes.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
});
