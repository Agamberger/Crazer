import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Card } from '@/shared/components';
import { spacing } from '@/shared/constants/theme';
import { OutingRow, OUTING_STATUS_CONFIG } from '@/shared/types';

interface OutingCardProps {
  outing: OutingRow;
  onPress?: () => void;
  testID?: string;
}

export const OutingCard: React.FC<OutingCardProps> = ({ outing, onPress, testID }) => {
  const formattedDate = outing.start_date
    ? new Date(outing.start_date).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const statusConfig = OUTING_STATUS_CONFIG[outing.status];
  const statusText = statusConfig ? `${statusConfig.emoji} ${statusConfig.label}` : outing.status;

  return (
    <Card
      style={styles.container}
      onPress={onPress}
      accessibilityLabel={onPress ? `Ouvrir la sortie ${outing.title}` : undefined}
      testID={testID}
    >
      <View style={styles.header}>
        <AppText
          variant="h3"
          weight="bold"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.title}
        >
          {outing.title}
        </AppText>
        <Badge label={statusText} />
      </View>
      {outing.description ? (
        <AppText
          variant="bodySmall"
          color="secondary"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={styles.description}
        >
          {outing.description}
        </AppText>
      ) : null}
      {formattedDate ? (
        <AppText variant="caption" color="muted">
          📅 {formattedDate}
        </AppText>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  description: {
    marginBottom: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
  },
});
