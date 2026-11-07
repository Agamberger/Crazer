import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, iconSizes, radii, spacing, typography } from '@/shared/constants/theme';

export interface SearchBarProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  /** Appelé quand l'utilisateur vide le champ via la croix. */
  onClear?: () => void;
  loading?: boolean;
  /** Style du conteneur (marges, ombre pour une barre flottante…). */
  containerStyle?: StyleProp<ViewStyle>;
}

export const SearchBar = forwardRef<React.ComponentRef<typeof TextInput>, SearchBarProps>(
  (
    {
      value,
      onChangeText,
      onClear,
      loading = false,
      placeholder = 'Rechercher…',
      containerStyle,
      style,
      testID,
      accessibilityLabel,
      ...props
    },
    ref,
  ) => {
    const handleClear = () => {
      onChangeText('');
      onClear?.();
    };

    return (
      <View
        style={[styles.container, containerStyle]}
        testID={testID ? `${testID}-container` : undefined}
      >
        <Ionicons name="search" size={iconSizes.md} color={colors.textMuted} />
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityRole="search"
          accessibilityLabel={accessibilityLabel ?? placeholder}
          testID={testID}
          {...props}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} testID="search-bar-loader" />
        ) : value.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
            hitSlop={8}
            testID={testID ? `${testID}-clear` : 'search-bar-clear'}
          >
            <Ionicons name="close-circle" size={iconSizes.md} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  },
);

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: radii.full,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    minWidth: 0,
    fontSize: typography.fontSizes.md,
    marginHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
