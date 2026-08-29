import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '../types';

export type CategoryFilterValue = ExpenseCategory | 'all';

export interface CategoryFilterChipsProps {
  selectedCategory: CategoryFilterValue;
  onSelectCategory: (category: CategoryFilterValue) => void;
  style?: ViewStyle;
  testID?: string;
}

interface FilterOption {
  id: CategoryFilterValue;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const FILTER_OPTIONS: readonly FilterOption[] = [
  { id: 'all', label: 'Tous', iconName: 'apps-outline' },
  ...EXPENSE_CATEGORIES.map((cat) => ({
    id: cat.id as CategoryFilterValue,
    label: cat.label,
    iconName: cat.iconName as keyof typeof Ionicons.glyphMap,
  })),
];

export const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({
  selectedCategory,
  onSelectCategory,
  style,
  testID = 'category-filter-chips',
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
      testID={testID}
    >
      {FILTER_OPTIONS.map((option) => {
        const isSelected = selectedCategory === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelectCategory(option.id)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            testID={`category-chip-${option.id}`}
          >
            <Ionicons
              name={option.iconName}
              size={16}
              color={isSelected ? colors.white : colors.textSecondary}
              style={styles.icon}
            />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  labelSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
});
