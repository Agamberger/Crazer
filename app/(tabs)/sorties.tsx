import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, List, Screen } from '@/shared/components';
import { useAuth } from '@/features/auth';
import {
  OutingCard,
  OutingInvitation,
  PendingInvitationsSection,
  useOutingSchedulingStore,
  useOutingsStore,
  useVisibleOutings,
} from '@/features/outings';
import { OUTINGS_SCREEN_EDGES } from '@/features/outings/constants';
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { spacing } from '@/shared/constants/theme';

/** Sorties tab: pending invitations and my outings; an outing opens its hub. */
export default function SortiesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const visibleOutings = useVisibleOutings();
  const isLoading = useOutingsStore((state) => state.isLoading);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const invitations = useOutingSchedulingStore((state) => state.invitations);
  const fetchInvitations = useOutingSchedulingStore((state) => state.fetchInvitations);

  const { pendingRequests, fetchFriendsList, acceptFriendRequest, removeFriendship } = useFriends();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOutings();
  }, [fetchOutings]);

  useEffect(() => {
    if (user) {
      fetchFriendsList();
    }
  }, [user, fetchFriendsList]);

  useEffect(() => {
    if (user?.id) fetchInvitations(user.id);
  }, [user?.id, fetchInvitations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOutings(),
        user ? fetchFriendsList() : Promise.resolve(),
        user?.id ? fetchInvitations(user.id) : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOutings, fetchFriendsList, fetchInvitations, user]);

  const handleOpenOuting = (id: string) => {
    router.push({ pathname: '/outing/[id]', params: { id } });
  };

  const handleCreateOuting = () => {
    router.push('/outing/create');
  };

  const handleOpenInvitation = (invitation: OutingInvitation) => {
    router.push({ pathname: '/outing/[id]/join', params: { id: invitation.outing.id } });
  };

  return (
    <Screen edges={OUTINGS_SCREEN_EDGES} padded={false}>
      <PendingFriendRequestsBanner
        pendingRequests={pendingRequests}
        onAccept={acceptFriendRequest}
        onReject={removeFriendship}
      />

      <View style={styles.headerArea}>
        <PendingInvitationsSection
          invitations={invitations}
          onOpenInvitation={handleOpenInvitation}
        />
        <AppText variant="bodySmall" color="secondary">
          Organise et rejoins des sorties entre amis !
        </AppText>
        <Button
          title="+ Organiser une sortie"
          onPress={handleCreateOuting}
          style={styles.createButton}
        />
      </View>

      <List
        data={visibleOutings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OutingCard outing={item} onPress={() => handleOpenOuting(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        loading={isLoading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        empty={{
          icon: 'calendar-outline',
          title: 'Aucune sortie pour le moment.',
          description: 'Crée ta première sortie en cliquant ci-dessus !',
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  createButton: {
    marginTop: spacing.sm,
  },
  headerArea: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
});
