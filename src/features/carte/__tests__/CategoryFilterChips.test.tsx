import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CategoryFilterChips, MAP_CATEGORY_FILTERS } from '../components/CategoryFilterChips';

describe('CategoryFilterChips', () => {
  it('renders a chip per category', () => {
    const { getByLabelText } = render(
      <CategoryFilterChips selectedCategory="all" onSelectCategory={jest.fn()} />,
    );

    MAP_CATEGORY_FILTERS.forEach((cat) => {
      expect(getByLabelText(`Filtrer par catégorie ${cat.label}`)).toBeTruthy();
    });
  });

  it('selects a category', () => {
    const onSelectCategory = jest.fn();
    const { getByLabelText } = render(
      <CategoryFilterChips selectedCategory="all" onSelectCategory={onSelectCategory} />,
    );

    fireEvent.press(getByLabelText('Filtrer par catégorie Bars'));
    expect(onSelectCategory).toHaveBeenCalledWith('bar');
  });
});
