import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Badge } from '@/shared/types';

export interface BadgesSectionProps {
  badges: Badge[];
}

export const BadgesSection: React.FC<BadgesSectionProps> = ({ badges }) => {
  return (
    <View style={styles.container} testID="badges-section">
      <Text style={styles.sectionTitle}>🏆 Badges & Accomplissements</Text>
      {badges.map((badge) => {
        const isUnlocked = Boolean(badge.unlockedAt);
        return (
          <Card
            key={badge.id}
            style={[styles.badgeCard, !isUnlocked && styles.lockedCard]}
            testID={`badge-card-${badge.id}`}
          >
            <View style={styles.badgeHeader}>
              <View style={[styles.iconContainer, isUnlocked && styles.unlockedIconContainer]}>
                <Text style={styles.badgeIcon}>{isUnlocked ? '🏆' : '🔒'}</Text>
              </View>
              <View style={styles.badgeInfo}>
                <Text style={[styles.badgeTitle, !isUnlocked && styles.lockedText]}>
                  {badge.title}
                </Text>
                <Text style={styles.badgeDescription}>{badge.description}</Text>
              </View>

              <View style={[styles.statusChip, isUnlocked ? styles.unlockedChip : styles.lockedChip]}>
                <Text style={[styles.chipText, isUnlocked ? styles.unlockedChipText : styles.lockedChipText]}>
                  {isUnlocked ? 'Débloqué' : 'Verrouillé'}
                </Text>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  badgeDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    lineHeight: 16,
  },
  badgeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  badgeIcon: {
    fontSize: typography.fontSizes.md,
  },
  badgeInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  badgeTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  chipText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    marginBottom: spacing.md,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 40,
  },
  lockedCard: {
    opacity: 0.7,
  },
  lockedChip: {
    backgroundColor: colors.surfaceLight,
  },
  lockedChipText: {
    color: colors.textMuted,
  },
  lockedText: {
    color: colors.textSecondary,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  statusChip: {
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  unlockedChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.success,
    borderWidth: 1,
  },
  unlockedChipText: {
    color: colors.success,
  },
  unlockedIconContainer: {
    backgroundColor: colors.primaryDark,
  },
});
