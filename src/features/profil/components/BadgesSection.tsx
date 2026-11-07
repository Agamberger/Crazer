import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge as StatusBadge, Card, SectionHeader } from '@/shared/components';
import { colors, opacity, radii, spacing } from '@/shared/constants/theme';
import { Badge } from '@/shared/types';

export interface BadgesSectionProps {
  badges: Badge[];
}

export const BadgesSection: React.FC<BadgesSectionProps> = ({ badges }) => (
  <View style={styles.container} testID="badges-section">
    <SectionHeader title="🏆 Badges & Accomplissements" style={styles.header} />
    {badges.map((badge) => {
      const isUnlocked = Boolean(badge.unlockedAt);
      return (
        <Card
          key={badge.id}
          style={[styles.badgeCard, !isUnlocked && styles.lockedCard]}
          testID={`badge-card-${badge.id}`}
        >
          <View style={[styles.iconContainer, isUnlocked && styles.unlockedIconContainer]}>
            <AppText>{isUnlocked ? '🏆' : '🔒'}</AppText>
          </View>
          <View style={styles.badgeInfo}>
            <AppText
              variant="bodySmall"
              weight="bold"
              color={isUnlocked ? 'primary' : 'secondary'}
              style={styles.badgeTitle}
            >
              {badge.title}
            </AppText>
            <AppText variant="caption" color="secondary">
              {badge.description}
            </AppText>
          </View>
          <StatusBadge
            label={isUnlocked ? 'Débloqué' : 'Verrouillé'}
            tone={isUnlocked ? 'success' : 'neutral'}
          />
        </Card>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  badgeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.xs,
    padding: spacing.sm,
  },
  badgeInfo: {
    flex: 1,
    paddingRight: spacing.xs,
  },
  badgeTitle: {
    marginBottom: 2,
  },
  container: {
    marginBottom: spacing.md,
  },
  header: {
    marginTop: spacing.sm,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.full,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 40,
  },
  lockedCard: {
    opacity: opacity.disabled + 0.2,
  },
  unlockedIconContainer: {
    backgroundColor: colors.primaryDark,
  },
});
