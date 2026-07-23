import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SortieCard, useSortiesStore } from '@/features/sorties';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function SortiesScreen() {
  const sorties = useSortiesStore((state) => state.sorties);

  return (
    <View style={styles.container}>
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
    paddingTop: spacing.md,
  },
  listContent: {
    padding: spacing.md,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.md,
  },
});
