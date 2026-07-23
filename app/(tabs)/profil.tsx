import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useProfilStore } from '@/features/profil';
import { useGamificationStore } from '@/features/gamification';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function ProfilScreen() {
  const user = useProfilStore((state) => state.currentUser);
  const badges = useGamificationStore((state) => state.badges);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.stats}>👥 {user.friendsCount} amis sur Crazer</Text>
      </Card>

      <Text style={styles.sectionTitle}>{"Centres d'intérêt"}</Text>
      <View style={styles.tagsContainer}>
        {user.interests.map((interest, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{interest}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Badges & Accomplissements</Text>
      {badges.map((badge) => (
        <Card key={badge.id} style={styles.badgeCard}>
          <Text style={styles.badgeTitle}>
            {badge.unlockedAt ? '🏆' : '🔒'} {badge.title}
          </Text>
          <Text style={styles.badgeDescription}>{badge.description}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeCard: {
    marginBottom: spacing.xs,
  },
  badgeDescription: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  badgeTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  card: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: spacing.md,
  },
  email: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  stats: {
    color: colors.accent,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
});
