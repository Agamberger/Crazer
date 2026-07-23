import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useActivitesStore } from '@/features/activites';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';

export default function ActivitesScreen() {
  const { activites, userVotes, voteActivite } = useActivitesStore();

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{"Trouvez l'activité idéale par vote ou swipe !"}</Text>
      <FlatList
        data={activites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const vote = userVotes[item.id];
          return (
            <Card style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.details}>
                📍 {item.location.address} • 💶 env. {item.estimatedBudget}€ • ⭐ {item.rating}
              </Text>
              <View style={styles.voteRow}>
                <Button
                  title={vote === 'like' ? '❤️ Liké' : '👍 Voter pour'}
                  variant={vote === 'like' ? 'primary' : 'outline'}
                  onPress={() => voteActivite(item.id, 'like')}
                  style={styles.voteButton}
                />
                <Button
                  title={vote === 'dislike' ? '❌ Exclu' : '👎 Non merci'}
                  variant={vote === 'dislike' ? 'secondary' : 'outline'}
                  onPress={() => voteActivite(item.id, 'dislike')}
                  style={styles.voteButton}
                />
              </View>
            </Card>
          );
        }}
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
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.xs,
  },
  details: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.xs,
  },
  voteButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  voteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
});
