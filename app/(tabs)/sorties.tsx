import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from 'expo-router';
import type { NavigationProp, NavigationState, ParamListBase } from '@react-navigation/native';
import { AppText, Button, List, Screen } from '@/shared/components';
import { useAuth } from '@/features/auth';
import {
  OutingCard,
  OutingEditScreen,
  PlannedOutingEditScreen,
  useOutingEditing,
  useOutingsStore,
} from '@/features/outings';
import { OUTINGS_SCREEN_EDGES } from '@/features/outings/constants';
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { spacing } from '@/shared/constants/theme';
import { toast } from '@/shared/store/useToastStore';

/** Navigation de l'onglet, avec l'événement `tabPress` du navigateur à onglets. */
type TabNavigation = NavigationProp<
  ParamListBase,
  string,
  undefined,
  NavigationState,
  object,
  { tabPress: { data: undefined; canPreventDefault: true } }
>;

export default function SortiesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<TabNavigation>();

  // Outings store state
  const outings = useOutingsStore((state) => state.outings);
  const isLoading = useOutingsStore((state) => state.isLoading);
  const error = useOutingsStore((state) => state.error);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);

  // Outing / step edition
  const {
    selectedOutingId,
    selectedPlannedOutingId,
    plannedOutings,
    isLoadingPlannedOutings,
    selectOuting,
    selectPlannedOuting,
    handleUpdateOuting,
    handleCancelEdit,
    handleUpdatePlannedOuting,
    handleDeletePlannedOuting,
    handleCancelPlannedEdit,
  } = useOutingEditing();

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
    // Un nouvel appui sur l'onglet ramène à la liste des sorties
    const unsubscribe = navigation?.addListener?.('tabPress', () => {
      selectOuting(null);
      selectPlannedOuting(null);
    });
    return unsubscribe;
  }, [navigation, selectOuting, selectPlannedOuting]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchOutings(), user ? fetchFriendsList() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOutings, fetchFriendsList, user]);

  const handleSelectOuting = (id: string) => {
    selectOuting(id);
  };

  const handleSelectPlannedOuting = (id: string) => {
    selectPlannedOuting(id);
  };

  const handleCreateOuting = async () => {
    if (!user?.id) return;
    try {
      await createOuting(user.id);
    } catch {
      toast.error('Impossible de créer la sortie. Réessaie dans un instant.', { title: 'Erreur' });
    }
  };

  // Case 1: Editing a selected planned outing
  if (selectedPlannedOutingId) {
    return (
      <PlannedOutingEditScreen
        plannedOuting={plannedOutings.find((p) => p.id === selectedPlannedOutingId)}
        parentOutingTitle={outings.find((o) => o.id === selectedOutingId)?.title}
        isLoading={isLoadingPlannedOutings}
        error={error}
        onSubmit={handleUpdatePlannedOuting}
        onDelete={handleDeletePlannedOuting}
        onCancel={handleCancelPlannedEdit}
      />
    );
  }

  // Case 2: Editing a selected outing
  if (selectedOutingId) {
    return (
      <OutingEditScreen
        outing={outings.find((o) => o.id === selectedOutingId)}
        isLoading={isLoading}
        error={error}
        plannedOutings={plannedOutings}
        onSubmit={handleUpdateOuting}
        onCancel={handleCancelEdit}
        onSelectPlannedOuting={(po) => handleSelectPlannedOuting(po.id)}
      />
    );
  }

  // Case 3: Outings list
  return (
    <Screen edges={OUTINGS_SCREEN_EDGES} padded={false}>
      <PendingFriendRequestsBanner
        pendingRequests={pendingRequests}
        onAccept={acceptFriendRequest}
        onReject={removeFriendship}
      />

      <View style={styles.headerArea}>
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
        data={outings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OutingCard outing={item} onPress={() => handleSelectOuting(item.id)} />
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
