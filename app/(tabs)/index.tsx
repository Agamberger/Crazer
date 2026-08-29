import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/features/auth';
import { OutingCard, OutingEditForm, useOutingsStore } from '@/features/outings';
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { OutingUpdate } from '@/shared/types';

export default function OutingsScreen() {
  const navigation = useNavigation();
  const outings = useOutingsStore((state) => state.outings);
  const selectedOutingId = useOutingsStore((state) => state.selectedOutingId);
  const selectOuting = useOutingsStore((state) => state.selectOuting);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const fetchOutingById = useOutingsStore((state) => state.fetchOutingById);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const updateOuting = useOutingsStore((state) => state.updateOuting);
  const isLoading = useOutingsStore((state) => state.isLoading);
  const error = useOutingsStore((state) => state.error);

  const { user } = useAuth();
  const { pendingRequests, fetchFriendsList, acceptFriendRequest, removeFriendship } = useFriends();

  useEffect(() => {
    fetchFriendsList();
    fetchOutings();
  }, [fetchFriendsList, fetchOutings]);

  const selectedOuting = outings.find((o) => o.id === selectedOutingId);

  useEffect(() => {
    if (navigation?.setOptions) {
      navigation.setOptions({
        headerTitle: selectedOuting ? selectedOuting.title : (selectedOutingId ? 'Sortie' : 'Mes Sorties'),
      });
    }
  }, [navigation, selectedOuting, selectedOutingId]);

  useEffect(() => {
    const nav = navigation as unknown as { addListener?: (event: string, cb: () => void) => () => void };
    const unsubscribe = nav?.addListener?.('tabPress', () => {
      selectOuting(null);
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, selectOuting]);

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

  // Si une sortie est sélectionnée pour modification
  if (selectedOutingId) {
    if (isLoading && !selectedOuting) {
      return (
        <View style={styles.centerContainer} testID="loading-state">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement de la sortie...</Text>
        </View>
      );
    }

    if (!selectedOuting) {
      return (
        <View style={styles.centerContainer} testID="not-found-state">
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
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <OutingEditForm
          outing={selectedOuting}
          onSubmit={handleUpdateOuting}
          isLoading={isLoading}
          error={error}
          onCancel={handleCancelEdit}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
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
