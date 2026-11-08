import React, { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components';
import { useAuth } from '@/features/auth';
import {
  getFirstName,
  getGreeting,
  getNextOuting,
  getUpcomingOutings,
  HomeHeader,
  NextOutingSection,
  QuickAction,
  QuickActions,
  UpcomingOutingsSection,
} from '@/features/home';
import {
  OutingInvitation,
  PendingInvitationsSection,
  useOutingMembers,
  useOutingSchedulingStore,
  useOutingsStore,
  useVisibleOutings,
} from '@/features/outings';
import { useFriends } from '@/features/profil';
import { spacing } from '@/shared/constants/theme';
import { OutingRow } from '@/shared/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const outings = useVisibleOutings();
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const selectOuting = useOutingsStore((state) => state.selectOuting);
  const selectPlannedOuting = useOutingsStore((state) => state.selectPlannedOuting);
  const invitations = useOutingSchedulingStore((state) => state.invitations);
  const fetchInvitations = useOutingSchedulingStore((state) => state.fetchInvitations);
  const { pendingRequests, fetchFriendsList } = useFriends();

  useEffect(() => {
    fetchOutings();
  }, [fetchOutings]);

  useEffect(() => {
    if (user) fetchFriendsList();
  }, [user, fetchFriendsList]);

  useEffect(() => {
    if (user?.id) fetchInvitations(user.id);
  }, [user?.id, fetchInvitations]);

  const nextOuting = useMemo(() => getNextOuting(outings), [outings]);
  const upcomingOutings = useMemo(
    () => getUpcomingOutings(outings, new Date(), nextOuting?.id),
    [outings, nextOuting],
  );
  const nextOutingMembers = useOutingMembers(nextOuting);

  const openOutings = (outing: OutingRow | null) => {
    selectPlannedOuting(null);
    selectOuting(outing?.id ?? null);
    router.push('/(tabs)/sorties');
  };

  const handleCreateOuting = () => {
    router.push('/outing/create');
  };

  const openInvitation = (invitation: OutingInvitation) => {
    router.push({ pathname: '/outing/[id]/join', params: { id: invitation.outing.id } });
  };

  const pendingCount = pendingRequests.length;
  const actions: QuickAction[] = [
    {
      id: 'create-outing',
      label: 'Organiser une sortie',
      description: 'Choisis les jours, tes dispos et invite tes amis',
      icon: 'add-circle-outline',
      onPress: handleCreateOuting,
      disabled: !user,
    },
    {
      id: 'explore-map',
      label: 'Explorer la carte',
      description: 'Trouve des restos, bars et activités autour de toi',
      icon: 'map-outline',
      onPress: () => router.push('/(tabs)/carte'),
    },
    {
      id: 'friends',
      label: 'Mes amis',
      description:
        pendingCount > 0
          ? `${pendingCount} demande${pendingCount > 1 ? 's' : ''} d'ami en attente`
          : 'Recherche et ajoute des amis',
      icon: 'people-outline',
      onPress: () => router.push('/(tabs)/profil'),
    },
  ];

  return (
    <Screen scrollable edges={['top', 'left', 'right']} contentStyle={styles.container} testID="home-screen">
      <HomeHeader
        greeting={getGreeting()}
        firstName={getFirstName(user?.fullName, user?.email)}
        fullName={user?.fullName}
        avatarUrl={user?.avatarUrl}
      />
      <PendingInvitationsSection invitations={invitations} onOpenInvitation={openInvitation} />
      <NextOutingSection
        outing={nextOuting}
        members={nextOutingMembers}
        onOpenOuting={openOutings}
        onSeeAll={() => openOutings(null)}
        onCreateOuting={handleCreateOuting}
      />
      <UpcomingOutingsSection
        outings={upcomingOutings}
        onOpenOuting={openOutings}
        onCreateOuting={handleCreateOuting}
      />
      <QuickActions actions={actions} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
