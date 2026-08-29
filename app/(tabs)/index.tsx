import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/features/auth';
import {
  OutingCard,
  OutingEditForm,
  PlannedOutingEditForm,
  useOutingsStore,
} from '@/features/outings';
import {
  useFriends,
  PendingFriendRequestsBanner,
} from '@/features/profil';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
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
  const selectedPlannedOutingId = useOutingsStore(
    (state) => state.selectedPlannedOutingId
  );
  const selectPlannedOuting = useOutingsStore(
    (state) => state.selectPlannedOuting
  );
  const plannedOutings = useOutingsStore((state) => state.plannedOutings);
  const fetchPlannedOutings = useOutingsStore(
    (state) => state.fetchPlannedOutings
  );
  const updatePlannedOuting = useOutingsStore(
    (state) => state.updatePlannedOuting
  );
  const deletePlannedOuting = useOutingsStore(
    (state) => state.deletePlannedOuting
  );
  const isLoadingPlannedOutings = useOutingsStore(
    (state) => state.isLoadingPlannedOutings
  );

  const {
    pendingRequests,
    fetchFriendsList,
    acceptFriendRequest,
    removeFriendship,
  } = useFriends();

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
    if (navigation?.addListener) {
      const unsubscribe = navigation.addListener('tabPress', () => {
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
        user && typeof fetchFriendsList === 'function'
          ? fetchFriendsList()
          : Promise.resolve(),
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
    await createOuting(user?.id);
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
    const selectedPlannedOuting = plannedOutings.find(
      (p) => p.id === selectedPlannedOutingId
    );
    const selectedOuting = outings.find((o) => o.id === selectedOutingId);

    if (isLoadingPlannedOutings && !selectedPlannedOuting) {
      return (
        <SafeAreaView
          style={styles.centerContainer}
          edges={['top', 'left', 'right']}
          testID="planned-loading-state"
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de l&apos;étape...</Text>
        </SafeAreaView>
      );
    }

    if (!selectedPlannedOuting) {
      return (
        <SafeAreaView
          style={styles.centerContainer}
          edges={['top', 'left', 'right']}
          testID="planned-not-found-state"
        >
          <Text style={styles.notFoundTitle}>Étape introuvable</Text>
          <Text style={styles.notFoundSubtitle}>
            L&apos;étape demandée n&apos;existe pas ou a été supprimée.
          </Text>
          <Button
            title="Retour à la sortie"
            variant="primary"
            onPress={handleCancelPlannedEdit}
            style={styles.backButton}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView
        style={styles.container}
        edges={['top', 'left', 'right']}
        testID="planned-outing-edit-screen"
      >
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
      </SafeAreaView>
    );
  }

  // Case 2: Editing a selected outing
  if (selectedOutingId) {
    const selectedOuting = outings.find((o) => o.id === selectedOutingId);

    if (isLoading && !selectedOuting) {
      return (
        <SafeAreaView
          style={styles.centerContainer}
          edges={['top', 'left', 'right']}
          testID="loading-state"
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de la sortie...</Text>
        </SafeAreaView>
      );
    }

    if (!selectedOuting) {
      return (
        <SafeAreaView
          style={styles.centerContainer}
          edges={['top', 'left', 'right']}
          testID="not-found-state"
        >
          <Text style={styles.notFoundTitle}>Sortie introuvable</Text>
          <Text style={styles.notFoundSubtitle}>
            La sortie demandée n&apos;existe pas ou vous n&apos;avez pas les autorisations nécessaires.
          </Text>
          <Button
            title="Retour aux sorties"
            variant="primary"
            onPress={handleCancelEdit}
            style={styles.backButton}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <OutingEditForm
          outing={selectedOuting}
          onSubmit={handleUpdateOuting}
          isLoading={isLoading}
          error={error}
          onCancel={handleCancelEdit}
          plannedOutings={plannedOutings}
          onSelectPlannedOuting={(po) => handleSelectPlannedOuting(po.id)}
        />
      </SafeAreaView>
    );
  }

  // Case 3: Outings list
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <PendingFriendRequestsBanner
        pendingRequests={pendingRequests}
        onAccept={acceptFriendRequest}
        onReject={removeFriendship}
      />

      <View style={styles.headerArea}>
        <Text style={styles.subtitle}>
          Organise et rejoins des sorties entre amis !
        </Text>
        <Button
          title="+ Organiser une sortie"
          variant="primary"
          onPress={handleCreateOuting}
          style={styles.createButton}
        />
      </View>

      <FlatList
        data={outings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OutingCard
            outing={item}
            onPress={() => handleSelectOuting(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Aucune sortie pour le moment.
              </Text>
              <Text style={styles.emptySubtext}>
                Crée ta première sortie en cliquant ci-dessus !
              </Text>
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginTop: spacing.md,
  },
  centerContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  createButton: {
    marginTop: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
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
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.md,
  },
  notFoundSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  notFoundTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
});
