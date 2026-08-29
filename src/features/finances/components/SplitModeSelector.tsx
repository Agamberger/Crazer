import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { SplitType, SPLIT_TYPES } from '../types';

export interface SplitModeSelectorProps {
  selectedMode: SplitType;
  onSelectMode: (mode: SplitType) => void;
  style?: ViewStyle;
  testID?: string;
}

const SPLIT_ICONS: Record<SplitType, keyof typeof Ionicons.glyphMap> = {
  equal: 'people-outline',
  exact: 'cash-outline',
  percentage: 'pie-chart-outline',
  shares: 'calculator-outline',
};

export const SplitModeSelector: React.FC<SplitModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  style,
  testID = 'split-mode-selector',
}) => {
  const currentInfo = SPLIT_TYPES.find((t) => t.id === selectedMode);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <Text style={styles.sectionLabel}>Mode de répartition</Text>

      <View style={styles.grid}>
        {SPLIT_TYPES.map((type) => {
          const isSelected = selectedMode === type.id;
          const iconName = SPLIT_ICONS[type.id];

          return (
            <TouchableOpacity
              key={type.id}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => onSelectMode(type.id)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              testID={`split-mode-${type.id}`}
            >
              <Ionicons
                name={iconName}
                size={18}
                color={isSelected ? colors.white : colors.textSecondary}
                style={styles.icon}
              />
              <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {currentInfo ? (
        <Text style={styles.descriptionText} testID="split-mode-description">
          💡 {currentInfo.description}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 3,
    paddingVertical: spacing.sm,
  },
  buttonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  buttonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  buttonTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    marginVertical: spacing.xs,
  },
  descriptionText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  icon: {
    marginRight: 4,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
});
