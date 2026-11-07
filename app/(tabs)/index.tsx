import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/shared/components';
import { useAuth } from '@/features/auth';
import {
  getFirstName,
  getGreeting,
  getNextOuting,
  HomeHeader,
  NextOutingSection,
  QuickAction,
  QuickActions,
} from '@/features/home';
import { useOutingsStore } from '@/features/outings';
import { useFriends } from '@/features/profil';
import { spacing } from '@/shared/constants/theme';
import { toast } from '@/shared/store/useToastStore';
import { OutingRow } from '@/shared/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const outings = useOutingsStore((state) => state.outings);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const selectOuting = useOutingsStore((state) => state.selectOuting);
  const selectPlannedOuting = useOutingsStore((state) => state.selectPlannedOuting);
  const { pendingRequests, fetchFriendsList } = useFriends();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchOutings();
  }, [fetchOutings]);

  useEffect(() => {
    if (user) fetchFriendsList();
  }, [user, fetchFriendsList]);

  const nextOuting = useMemo(() => getNextOuting(outings), [outings]);

  const openOutings = (outing: OutingRow | null) => {
    selectPlannedOuting(null);
    selectOuting(outing?.id ?? null);
    router.push('/(tabs)/sorties');
  };

  const handleCreateOuting = async () => {
    if (!user) return;
    setIsCreating(true);
    try {
      // La sortie créée devient la sortie sélectionnée : l'onglet Sorties ouvre son édition.
      await createOuting(user.id);
      router.push('/(tabs)/sorties');
    } catch {
      toast.error("Impossible de créer la sortie. Réessaie dans un instant.", { title: 'Erreur' });
    } finally {
      setIsCreating(false);
    }
  };

  const pendingCount = pendingRequests.length;
  const actions: QuickAction[] = [
    {
      id: 'create-outing',
      label: 'Organiser une sortie',
      description: 'Crée une sortie et planifie ses étapes',
      icon: 'add-circle-outline',
      onPress: handleCreateOuting,
      disabled: isCreating || !user,
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
      <NextOutingSection
        outing={nextOuting}
        onOpenOuting={openOutings}
        onSeeAll={() => openOutings(null)}
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
