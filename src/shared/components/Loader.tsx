import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';

export interface LoaderProps {
  message?: string;
  /** Occupe tout l'espace disponible et centre le spinner. */
  fullScreen?: boolean;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  message,
  fullScreen = false,
  size = 'large',
  style,
  testID = 'loader',
}) => (
  <View
    style={[styles.container, fullScreen && styles.fullScreen, style]}
    accessibilityRole="progressbar"
    accessibilityLabel={message ?? 'Chargement en cours'}
    testID={testID}
  >
    <ActivityIndicator size={size} color={colors.primary} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullScreen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.sm,
  },
});
