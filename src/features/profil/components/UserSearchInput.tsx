import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';

export interface UserSearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  isSearching?: boolean;
  placeholder?: string;
  testID?: string;
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({
  value,
  onChangeText,
  onClear,
  isSearching = false,
  placeholder = 'Rechercher un utilisateur par nom ou email...',
  testID = 'input-user-search',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Champ de recherche d'utilisateurs"
        testID={testID}
      />
      {isSearching ? (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loader} testID="search-loader" />
      ) : value.length > 0 ? (
        <TouchableOpacity
          onPress={onClear}
          style={styles.clearButton}
          accessibilityLabel="Effacer la recherche"
          accessibilityRole="button"
          testID="btn-clear-search"
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.sm,
    paddingVertical: 4,
  },
  loader: {
    marginLeft: spacing.xs,
  },
  searchIcon: {
    fontSize: typography.fontSizes.md,
    marginRight: spacing.sm,
  },
});
