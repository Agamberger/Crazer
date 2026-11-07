import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, spacing, typography } from '@/shared/constants/theme';
import { Button } from './Button';
import { IconName } from './types';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Écran / bloc vide avec appel à l'action (liste vide, aucun résultat…). */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'sparkles-outline',
  actionLabel,
  onAction,
  style,
  testID = 'empty-state',
}) => (
  <View style={[styles.container, style]} testID={testID}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={32} color={colors.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
    {actionLabel && onAction ? (
      <Button
        title={actionLabel}
        onPress={onAction}
        size="sm"
        style={styles.action}
        testID={`${testID}-action`}
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.md,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.full,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 64,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
  },
});
