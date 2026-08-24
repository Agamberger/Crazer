import React, { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/features/auth';
import { OutingCard, useOutingsStore } from '@/features/outings';
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function OutingsScreen() {
  const outings = useOutingsStore((state) => state.outings);
  const fetchOutings = useOutingsStore((state) => state.fetchOutings);
  const createOuting = useOutingsStore((state) => state.createOuting);
  const isLoading = useOutingsStore((state) => state.isLoading);
  const error = useOutingsStore((state) => state.error);

  const { user } = useAuth();
  const { pendingRequests, fetchFriendsList, acceptFriendRequest, removeFriendship } = useFriends();

  useEffect(() => {
    fetchFriendsList();
    fetchOutings();
  }, [fetchFriendsList, fetchOutings]);

  const handleCreateOuting = async () => {
    await createOuting(user?.id);
  };

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
        renderItem={({ item }) => <OutingCard outing={item} />}
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.xs,
  },
});
