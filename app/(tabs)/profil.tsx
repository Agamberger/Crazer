import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '@/features/auth';
import { useGamificationStore } from '@/features/gamification';
import {
  useProfilStore,
  UserSearchModal,
  useFriends,
  ProfileHeaderCard,
  InterestsSection,
  BadgesSection,
} from '@/features/profil';
import { Button } from '@/shared/components/Button';
import { colors, spacing } from '@/shared/constants/theme';

export default function ProfilScreen() {
  const { user: authUser, logout, isLoading } = useAuth();
  const mockUser = useProfilStore((state) => state.currentUser);
  const badges = useGamificationStore((state) => state.badges);
  const { friends, pendingRequests, fetchFriendsList } = useFriends();

  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);

  useEffect(() => {
    fetchFriendsList();
  }, [fetchFriendsList]);

  const displayName = authUser?.fullName || mockUser.name || 'Utilisateur';
  const displayEmail = authUser?.email || mockUser.email || '';
  const friendsCount = authUser ? friends.length : 0;
  const unlockedBadgesCount = badges.filter((b) => Boolean(b.unlockedAt)).length;

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Erreur capturée dans le store Zustand
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ProfileHeaderCard
        displayName={displayName}
        displayEmail={displayEmail}
        friendsCount={friendsCount}
        pendingRequestsCount={pendingRequests.length}
        unlockedBadgesCount={unlockedBadgesCount}
        totalBadgesCount={badges.length}
        onOpenFriendsSearch={() => setIsSearchModalVisible(true)}
      />

      <InterestsSection interests={mockUser.interests} />

      <BadgesSection badges={badges} />

      <Button
        title="Se déconnecter"
        variant="outline"
        loading={isLoading}
        onPress={handleLogout}
        style={styles.logoutButton}
        testID="btn-logout"
      />

      <UserSearchModal
        visible={isSearchModalVisible}
        onClose={() => setIsSearchModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: spacing.md,
  },
  logoutButton: {
    borderColor: colors.error,
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
});
