import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { AppText, Button, EmptyState, List, Loader, Screen } from '@/shared/components';
import { useAuth } from '@/features/auth';
import {
  OutingCard,
  OutingEditForm,
  PlannedOutingEditForm,
  useOutingsStore,
} from '@/features/outings';
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { spacing } from '@/shared/constants/theme';
import { OutingUpdate, PlannedOutingUpdate } from '@/shared/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Outings store state
  const outings = useOutingsStore((state) => state.outings);
  const isLoading = useOutingsStore((state) => state.isLoading);
  const error = useOutingsStore((state) => state.error);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const updateOuting = useOutingsStore((state) => state.updateOuting);

  // Selection state
  const selectedOutingId = useOutingsStore((state) => state.selectedOutingId);
  const selectOuting = useOutingsStore((state) => state.selectOuting);
  const selectedPlannedOutingId = useOutingsStore((state) => state.selectedPlannedOutingId);
  const selectPlannedOuting = useOutingsStore((state) => state.selectPlannedOuting);
  const plannedOutings = useOutingsStore((state) => state.plannedOutings);
  const fetchPlannedOutings = useOutingsStore((state) => state.fetchPlannedOutings);
  const updatePlannedOuting = useOutingsStore((state) => state.updatePlannedOuting);
  const deletePlannedOuting = useOutingsStore((state) => state.deletePlannedOuting);
  const isLoadingPlannedOutings = useOutingsStore((state) => state.isLoadingPlannedOutings);

  const { pendingRequests, fetchFriendsList, acceptFriendRequest, removeFriendship } = useFriends();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOutings();
  }, [fetchOutings]);

  useEffect(() => {
    if (user && typeof fetchFriendsList === 'function') {
      fetchFriendsList();
    }
  }, [user, fetchFriendsList]);

  useEffect(() => {
    if (selectedOutingId && !selectedPlannedOutingId) {
      fetchPlannedOutings(selectedOutingId);
    }
  }, [selectedOutingId, selectedPlannedOutingId, fetchPlannedOutings]);

  useEffect(() => {
    if (navigation && 'addListener' in navigation) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const unsubscribe = (navigation as any).addListener('tabPress', () => {
        selectOuting(null);
        selectPlannedOuting(null);
      });
      return unsubscribe;
    }
  }, [navigation, selectOuting, selectPlannedOuting]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOutings(),
        user && typeof fetchFriendsList === 'function' ? fetchFriendsList() : Promise.resolve(),
      ]);
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
    await createOuting(user.id);
  };

  const handleUpdateOuting = async (updates: OutingUpdate) => {
    if (!selectedOutingId) return;
    try {
      await updateOuting(selectedOutingId, updates);
      selectOuting(null);
    } catch {
      // Error handled in store
    }
  };

  const handleCancelEdit = () => {
    selectOuting(null);
  };

  const handleUpdatePlannedOuting = async (updates: PlannedOutingUpdate) => {
    if (!selectedPlannedOutingId) return;
    try {
      await updatePlannedOuting(selectedPlannedOutingId, updates);
      selectPlannedOuting(null);
    } catch {
      // Error handled in store
    }
  };

  const handleDeletePlannedOuting = async () => {
    if (!selectedPlannedOutingId) return;
    try {
      await deletePlannedOuting(selectedPlannedOutingId);
      selectPlannedOuting(null);
    } catch {
      // Error handled in store
    }
  };

  const handleCancelPlannedEdit = () => {
    selectPlannedOuting(null);
  };

  // Case 1: Editing a selected planned outing
  if (selectedPlannedOutingId) {
    const selectedPlannedOuting = plannedOutings.find((p) => p.id === selectedPlannedOutingId);
    const selectedOuting = outings.find((o) => o.id === selectedOutingId);

    if (isLoadingPlannedOutings && !selectedPlannedOuting) {
      return (
        <Screen edges={SCREEN_EDGES} testID="planned-loading-state">
          <Loader fullScreen message="Chargement de l'étape..." />
        </Screen>
      );
    }

    if (!selectedPlannedOuting) {
      return (
        <Screen edges={SCREEN_EDGES} contentStyle={styles.center} testID="planned-not-found-state">
          <EmptyState
            icon="help-circle-outline"
            title="Étape introuvable"
            description="L'étape demandée n'existe pas ou a été supprimée."
            actionLabel="Retour à la sortie"
            onAction={handleCancelPlannedEdit}
          />
        </Screen>
      );
    }

    return (
      <Screen edges={SCREEN_EDGES} padded={false} testID="planned-outing-edit-screen">
        <PlannedOutingEditForm
          plannedOuting={selectedPlannedOuting}
          parentOutingTitle={selectedOuting?.title}
          onSubmit={handleUpdatePlannedOuting}
          onDelete={handleDeletePlannedOuting}
          onCancel={handleCancelPlannedEdit}
          isLoading={isLoadingPlannedOutings}
          error={error}
          submitTestID="btn-submit-planned-edit"
          cancelTestID="btn-cancel-planned-edit"
          deleteTestID="btn-delete-planned-edit"
        />
      </Screen>
    );
  }

  // Case 2: Editing a selected outing
  if (selectedOutingId) {
    const selectedOuting = outings.find((o) => o.id === selectedOutingId);

    if (isLoading && !selectedOuting) {
      return (
        <Screen edges={SCREEN_EDGES} testID="loading-state">
          <Loader fullScreen message="Chargement de la sortie..." />
        </Screen>
      );
    }

    if (!selectedOuting) {
      return (
        <Screen edges={SCREEN_EDGES} contentStyle={styles.center} testID="not-found-state">
          <EmptyState
            icon="help-circle-outline"
            title="Sortie introuvable"
            description="La sortie demandée n'existe pas ou vous n'avez pas les autorisations nécessaires."
            actionLabel="Retour aux sorties"
            onAction={handleCancelEdit}
          />
        </Screen>
      );
    }

    return (
      <Screen edges={SCREEN_EDGES} padded={false}>
        <OutingEditForm
          outing={selectedOuting}
          onSubmit={handleUpdateOuting}
          isLoading={isLoading}
          error={error}
          onCancel={handleCancelEdit}
          plannedOutings={plannedOutings}
          onSelectPlannedOuting={(po) => handleSelectPlannedOuting(po.id)}
        />
      </Screen>
    );
  }

  // Case 3: Outings list
  return (
    <Screen edges={SCREEN_EDGES} padded={false}>
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

const SCREEN_EDGES: ('top' | 'left' | 'right')[] = ['top', 'left', 'right'];

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
  },
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
