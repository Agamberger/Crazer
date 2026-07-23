import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useJournalStore } from '@/features/journal';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function JournalScreen() {
  const journals = useJournalStore((state) => state.journals);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Vos souvenirs de sorties et moments forts</Text>
      <FlatList
        data={journals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            {item.notes.map((note, index) => (
              <Text key={index} style={styles.note}>
                💬 {note}
              </Text>
            ))}
            <Text style={styles.photosCount}>📸 {item.photos.length} photos enregistrées</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
    padding: spacing.md,
  },
  note: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginVertical: spacing.xs,
  },
  photosCount: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.md,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
});
