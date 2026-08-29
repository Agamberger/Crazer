import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { OutingRow, OUTING_STATUS_CONFIG } from '@/shared/types';

interface OutingCardProps {
  outing: OutingRow;
  onPress?: () => void;
}

export const OutingCard: React.FC<OutingCardProps> = ({ outing, onPress }) => {
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

  const content = (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {outing.title}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{statusText}</Text>
        </View>
      </View>
      {outing.description ? (
        <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
          {outing.description}
        </Text>
      ) : null}
      <View style={styles.footer}>
        {formattedDate ? <Text style={styles.footerText}>📅 {formattedDate}</Text> : null}
      </View>
    </Card>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{content}</TouchableOpacity>;
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primaryDark,
    borderRadius: 8,
    flexShrink: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    marginBottom: spacing.md,
  },
  description: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
});
