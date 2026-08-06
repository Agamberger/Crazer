import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';

export interface ProfileHeaderCardProps {
  displayName: string;
  displayEmail: string;
  friendsCount: number;
  pendingRequestsCount: number;
  unlockedBadgesCount: number;
  totalBadgesCount: number;
  onOpenFriendsSearch: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  displayName,
  displayEmail,
  friendsCount,
  pendingRequestsCount,
  unlockedBadgesCount,
  totalBadgesCount,
  onOpenFriendsSearch,
}) => {
  const getInitials = (name: string, email: string) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <Card style={styles.card} testID="profile-header-card">
      <View style={styles.avatarContainer}>
        <View style={styles.avatarGlow}>
          <Text style={styles.avatarText}>{getInitials(displayName, displayEmail)}</Text>
        </View>
        <View style={styles.onlineStatus} />
      </View>

      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.email}>{displayEmail}</Text>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statBox}
          onPress={onOpenFriendsSearch}
          activeOpacity={0.7}
          accessibilityLabel="Ouvrir la liste et recherche d'amis"
          accessibilityRole="button"
          testID="stat-box-friends"
        >
          <Text style={styles.statNumber}>{friendsCount}</Text>
          <Text style={styles.statLabel}>
            {friendsCount > 1 ? 'Amis' : 'Ami'}
            {pendingRequestsCount > 0 ? ` (${pendingRequestsCount} 📩)` : ''}
          </Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <View style={styles.statBox} testID="stat-box-badges">
          <Text style={styles.statNumber}>
            {unlockedBadgesCount}/{totalBadgesCount}
          </Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox} testID="stat-box-level">
          <Text style={styles.statNumber}>Niv. 4</Text>
          <Text style={styles.statLabel}>Explorateur</Text>
        </View>
      </View>

      <Button
        title="🔍 Rechercher & Ajouter des Amis"
        variant="primary"
        onPress={onOpenFriendsSearch}
        style={styles.searchFriendsButton}
        testID="btn-open-search-friends"
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  avatarGlow: {
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
    borderRadius: 44,
    borderWidth: 2.5,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  email: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  onlineStatus: {
    backgroundColor: colors.success,
    borderColor: colors.surface,
    borderRadius: 8,
    borderWidth: 2,
    bottom: 2,
    height: 16,
    position: 'absolute',
    right: 4,
    width: 16,
  },
  searchFriendsButton: {
    marginTop: spacing.md,
    width: '100%',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    backgroundColor: colors.border,
    height: 28,
    width: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginTop: 2,
  },
  statNumber: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  statsRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    width: '100%',
  },
});
