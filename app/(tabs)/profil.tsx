import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/features/auth';
import { useGamificationStore } from '@/features/gamification';
import { useProfilStore } from '@/features/profil';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function ProfilScreen() {
  const { user: authUser, logout, isLoading } = useAuth();
  const mockUser = useProfilStore((state) => state.currentUser);
  const badges = useGamificationStore((state) => state.badges);

  const displayName = authUser?.fullName || mockUser.name || 'Utilisateur';
  const displayEmail = authUser?.email || mockUser.email || '';

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Erreur capturée dans le store Zustand
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
        <Text style={styles.stats}>👥 {mockUser.friendsCount} amis sur Crazer</Text>
      </Card>

      <Text style={styles.sectionTitle}>{"Centres d'intérêt"}</Text>
      <View style={styles.tagsContainer}>
        {mockUser.interests.map((interest, index) => (
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

      <Button
        title="Se déconnecter"
        variant="outline"
        loading={isLoading}
        onPress={handleLogout}
        style={styles.logoutButton}
        testID="btn-logout"
      />
    </ScrollView>
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
    flexGrow: 1,
    padding: spacing.md,
  },
  email: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.xs,
  },
  logoutButton: {
    borderColor: colors.error,
    marginTop: spacing.xl,
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
