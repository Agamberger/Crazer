import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Sortie } from '@/shared/types';

interface SortieCardProps {
  sortie: Sortie;
  onPress?: () => void;
}

export const SortieCard: React.FC<SortieCardProps> = ({ sortie }) => {
  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{sortie.title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{sortie.status.toUpperCase()}</Text>
        </View>
      </View>
      {sortie.description ? <Text style={styles.description}>{sortie.description}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.footerText}>👥 {sortie.participantIds.length} participants</Text>
        {sortie.meetingPoint ? (
          <Text style={styles.footerText}>📍 {sortie.meetingPoint}</Text>
        ) : null}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    marginBottom: spacing.md,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
});
