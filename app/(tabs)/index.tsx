import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFriends, PendingFriendRequestsBanner } from '@/features/profil';
import { SortieCard, useSortiesStore } from '@/features/sorties';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function SortiesScreen() {
  const sorties = useSortiesStore((state) => state.sorties);
  const { pendingRequests, fetchFriendsList, acceptFriendRequest, removeFriendship } = useFriends();

  useEffect(() => {
    fetchFriendsList();
  }, [fetchFriendsList]);

  return (
    <View style={styles.container}>
      <PendingFriendRequestsBanner
        pendingRequests={pendingRequests}
        onAccept={acceptFriendRequest}
        onReject={removeFriendship}
      />

      <View style={styles.headerArea}>
        <Text style={styles.subtitle}>Organise et rejoins des sorties entre amis !</Text>
      </View>

      <FlatList
        data={sorties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SortieCard sortie={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucune sortie prévue pour le moment.</Text>
        }
      />
      <View style={styles.actionArea}>
        <Button title="+ Organiser une sortie" onPress={() => {}} />
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
