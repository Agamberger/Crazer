import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { ExpenseCategory, EXPENSE_CATEGORIES } from '../types';

export interface CategoryPickerProps {
  selectedCategory: ExpenseCategory;
  onSelectCategory: (category: ExpenseCategory) => void;
  style?: ViewStyle;
  testID?: string;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  selectedCategory,
  onSelectCategory,
  style,
  testID = 'category-picker',
}) => {
  return (
    <View style={[styles.container, style]} testID={testID}>
      <Text style={styles.label}>Catégorie de la dépense</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {EXPENSE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              testID={`category-option-${cat.id}`}
            >
              <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                <Ionicons
                  name={cat.iconName as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={isSelected ? colors.white : colors.textSecondary}
                />
              </View>
              <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
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
    marginVertical: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 40,
  },
  iconCircleSelected: {
    backgroundColor: colors.primary,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    width: 80,
  },
  itemSelected: {
    borderColor: colors.primary,
  },
  itemText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
  itemTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  scrollContent: {
    paddingVertical: 2,
  },
});
