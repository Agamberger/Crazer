import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
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
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { OutingUpdate, PlannedOutingUpdate } from '@/shared/types';

export default function OutingsScreen() {
  const navigation = useNavigation();
  const outings = useOutingsStore((state) => state.outings);
  const selectedOutingId = useOutingsStore((state) => state.selectedOutingId);
  const selectedPlannedOutingId = useOutingsStore((state) => state.selectedPlannedOutingId);
  const plannedOutings = useOutingsStore((state) => state.plannedOutings);
  const selectOuting = useOutingsStore((state) => state.selectOuting);
  const selectPlannedOuting = useOutingsStore((state) => state.selectPlannedOuting);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const fetchOutingById = useOutingsStore((state) => state.fetchOutingById);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const updatePlannedOuting = useOutingsStore((state) => state.updatePlannedOuting);
  const deletePlannedOuting = useOutingsStore((state) => state.deletePlannedOuting);
  const isLoading = useOutingsStore((state) => state.isLoading);
  const isLoadingPlannedOutings = useOutingsStore((state) => state.isLoadingPlannedOutings);
  const error = useOutingsStore((state) => state.error);

  const { user } = useAuth();
  const { pendingRequests, fetchFriendsList, acceptFriendRequest, removeFriendship } = useFriends();

  useEffect(() => {
    fetchFriendsList();
    fetchOutings();
  }, [fetchFriendsList, fetchOutings]);

  const selectedOuting = outings.find((o) => o.id === selectedOutingId);
  const selectedPlannedOuting = plannedOutings.find((p) => p.id === selectedPlannedOutingId);

  useEffect(() => {
    if (navigation?.setOptions) {
      if (selectedPlannedOuting) {
        navigation.setOptions({
          headerTitle: selectedPlannedOuting.title,
        });
      } else if (selectedOuting) {
        navigation.setOptions({
          headerTitle: selectedOuting.title,
        });
      } else {
        navigation.setOptions({
          headerTitle: 'Mes Sorties',
        });
      }
    }
  }, [navigation, selectedOuting, selectedPlannedOuting]);

  useEffect(() => {
    const nav = navigation as unknown as { addListener?: (event: string, cb: () => void) => () => void };
    const unsubscribe = nav?.addListener?.('tabPress', () => {
      selectPlannedOuting(null);
      selectOuting(null);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, selectOuting, selectPlannedOuting]);

  useEffect(() => {
    if (selectedOutingId && !selectedOuting) {
      fetchOutingById(selectedOutingId);
    }
  }, [selectedOutingId, selectedOuting, fetchOutingById]);

  const handleCreateOuting = async () => {
    await createOuting(user?.id);
  };

  const handleUpdateOuting = async (updates: OutingUpdate) => {
    if (!selectedOutingId) return;
    const result = await updateOuting(selectedOutingId, updates);
    if (result) {
      selectOuting(null);
    }
  };

  const handleCancelEdit = () => {
    selectOuting(null);
  };

  const handleUpdatePlannedOuting = async (updates: PlannedOutingUpdate) => {
    if (!selectedPlannedOutingId) return;
    const result = await updatePlannedOuting(selectedPlannedOutingId, updates);
    if (result) {
      selectPlannedOuting(null);
    }
  };

  const handleDeletePlannedOuting = async () => {
    if (!selectedPlannedOutingId) return;
    const success = await deletePlannedOuting(selectedPlannedOutingId);
    if (success) {
      selectPlannedOuting(null);
    }
  };

  const handleCancelPlannedEdit = () => {
    selectPlannedOuting(null);
  };

  // Case 1: Editing a selected planned outing
  if (selectedPlannedOutingId) {
    if (isLoadingPlannedOutings && !selectedPlannedOuting) {
      return (
        <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']} testID="planned-loading-state">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de l'étape...</Text>
        </SafeAreaView>
      );
    }

    if (!selectedPlannedOuting) {
      return (
        <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']} testID="planned-not-found-state">
          <Text style={styles.notFoundTitle}>Étape introuvable</Text>
          <Text style={styles.notFoundSubtitle}>
            L'étape demandée n'existe pas ou a été supprimée.
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
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="planned-outing-edit-screen">
        <PlannedOutingEditForm
          plannedOuting={selectedPlannedOuting}
          parentOutingTitle={selectedOuting?.title}
          onSubmit={handleUpdatePlannedOuting}
          onDelete={handleDeletePlannedOuting}
          onCancel={handleCancelPlannedEdit}
          isLoading={isLoadingPlannedOutings}
          error={error}
        />
      </SafeAreaView>
    );
  }

  // Case 2: Editing a selected outing
  if (selectedOutingId) {
    if (isLoading && !selectedOuting) {
      return (
        <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']} testID="loading-state">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de la sortie...</Text>
        </SafeAreaView>
      );
    }

    if (!selectedOuting) {
      return (
        <SafeAreaView style={styles.centerContainer} edges={['top', 'left', 'right']} testID="not-found-state">
          <Text style={styles.notFoundTitle}>Sortie introuvable</Text>
          <Text style={styles.notFoundSubtitle}>
            {"La sortie demandée n'existe pas ou vous n'avez pas les autorisations nécessaires."}
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
        <Text style={styles.subtitle}>Organise et rejoins des sorties entre amis !</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <FlatList
        data={outings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OutingCard outing={item} onPress={() => selectOuting(item.id)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && outings.length > 0}
            onRefresh={fetchOutings}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isLoading ? 'Chargement des sorties...' : 'Aucune sortie prévue pour le moment.'}
          </Text>
        }
      />
      <View style={styles.actionArea}>
        <Button
          title="+ Organiser une sortie"
          onPress={handleCreateOuting}
          loading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionArea: {
    padding: spacing.md,
  },
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
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.md,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.xs,
  },
  headerArea: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.md,
  },
  notFoundSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  notFoundTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.xs,
  },
});
