import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { MapCategoryFilter, PlaceCategoryFilter } from '../types/carte';

/** Category filters of the map, in display order. */
export const MAP_CATEGORY_FILTERS: MapCategoryFilter[] = [
  { id: 'all', label: 'Tous', iconName: '🌟' },
  { id: 'resto', label: 'Restos', iconName: '🍕' },
  { id: 'bar', label: 'Bars', iconName: '🍸' },
  { id: 'activite', label: 'Activités', iconName: '🎯' },
  { id: 'nature', label: 'Outdoor', iconName: '🌲' },
  { id: 'culture', label: 'Culture', iconName: '🎨' },
];

export interface CategoryFilterChipsProps {
  selectedCategory: PlaceCategoryFilter;
  onSelectCategory: (category: PlaceCategoryFilter) => void;
}

/** Horizontal row of category chips under the map search bar. */
export const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.categoriesContainer}
    keyboardShouldPersistTaps="handled"
  >
    {MAP_CATEGORY_FILTERS.map((cat) => (
      <Chip
        key={cat.id}
        label={cat.label}
        emoji={cat.iconName}
        selected={selectedCategory === cat.id}
        onPress={() => onSelectCategory(cat.id)}
        accessibilityLabel={`Filtrer par catégorie ${cat.label}`}
      />
    ))}
  </ScrollView>
);

const styles = StyleSheet.create({
  categoriesContainer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
