import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Card, List, Screen } from '@/shared/components';
import { useActivitesStore } from '@/features/activites';
import { spacing } from '@/shared/constants/theme';

export default function ActivitesScreen() {
  const activites = useActivitesStore((state) => state.activites);
  const userVotes = useActivitesStore((state) => state.userVotes);
  const voteActivite = useActivitesStore((state) => state.voteActivite);

  return (
    <Screen edges={['top', 'left', 'right']} contentStyle={styles.container}>
      <AppText color="secondary" style={styles.subtitle}>
        Trouvez l&apos;activité idéale par vote ou swipe !
      </AppText>
      <List
        data={activites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        empty={{ icon: 'compass-outline', title: 'Aucune activité pour le moment' }}
        renderItem={({ item }) => {
          const vote = userVotes[item.id];
          return (
            <Card style={styles.card}>
              <AppText variant="h3" weight="bold" style={styles.title}>
                {item.title}
              </AppText>
              <AppText variant="bodySmall" color="secondary" style={styles.description}>
                {item.description}
              </AppText>
              <AppText variant="caption" color="muted" style={styles.details}>
                📍 {item.location.address} • 💵 env. {item.estimatedBudget}€ • ⭐ {item.rating}
              </AppText>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  container: {
    paddingTop: spacing.sm,
  },
  description: {
    marginBottom: spacing.xs,
  },
  details: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.xs,
  },
  voteButton: {
    flex: 1,
  },
  voteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
