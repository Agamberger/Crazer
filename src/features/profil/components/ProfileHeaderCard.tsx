import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText, Avatar, Button, Card } from '@/shared/components';
import { colors, opacity, radii, spacing } from '@/shared/constants/theme';

export interface ProfileHeaderCardProps {
  displayName: string;
  displayEmail: string;
  avatarUrl?: string | null;
  friendsCount: number;
  pendingRequestsCount: number;
  unlockedBadgesCount: number;
  totalBadgesCount: number;
  onOpenFriendsSearch: () => void;
}

interface StatProps {
  value: string;
  label: string;
}

const Stat: React.FC<StatProps> = ({ value, label }) => (
  <>
    <AppText weight="bold">{value}</AppText>
    <AppText variant="caption" color="secondary" weight="medium" style={styles.statLabel}>
      {label}
    </AppText>
  </>
);

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  displayName,
  displayEmail,
  avatarUrl,
  friendsCount,
  pendingRequestsCount,
  unlockedBadgesCount,
  totalBadgesCount,
  onOpenFriendsSearch,
}) => {
  const friendsLabel = `${friendsCount > 1 ? 'Amis' : 'Ami'}${
    pendingRequestsCount > 0 ? ` (${pendingRequestsCount} 📩)` : ''
  }`;

  return (
    <Card style={styles.card} testID="profile-header-card">
      <Avatar
        name={displayName}
        fallback={displayEmail}
        imageUrl={avatarUrl}
        size="xl"
        online
        style={styles.avatar}
      />

      <AppText variant="h2" style={styles.name}>
        {displayName}
      </AppText>
      <AppText variant="bodySmall" color="secondary" style={styles.email}>
        {displayEmail}
      </AppText>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statBox}
          onPress={onOpenFriendsSearch}
          activeOpacity={opacity.pressed}
          accessibilityLabel="Ouvrir la liste et recherche d'amis"
          accessibilityRole="button"
          testID="stat-box-friends"
        >
          <Stat value={String(friendsCount)} label={friendsLabel} />
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <View style={styles.statBox} testID="stat-box-badges">
          <Stat value={`${unlockedBadgesCount}/${totalBadgesCount}`} label="Badges" />
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox} testID="stat-box-level">
          <Stat value="Niv. 4" label="Explorateur" />
        </View>
      </View>

      <Button
        title="Rechercher & Ajouter des Amis"
        leftIcon="search"
        onPress={onOpenFriendsSearch}
        fullWidth
        style={styles.searchFriendsButton}
        testID="btn-open-search-friends"
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  avatar: {
    borderColor: colors.primary,
    borderWidth: 2.5,
    marginBottom: spacing.sm,
  },
  card: {
    alignItems: 'center',
    borderRadius: radii.xl - 4,
    marginBottom: spacing.md,
    paddingVertical: spacing.lg,
  },
  email: {
    marginBottom: spacing.md,
  },
  name: {
    marginBottom: 2,
  },
  searchFriendsButton: {
    marginTop: spacing.md,
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
    marginTop: 2,
  },
  statsRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.md + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
});
