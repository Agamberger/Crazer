import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/shared/components/Card';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { formatCentsToEuros } from '../utils/formatters';

export interface FinancesSummaryCardProps {
  totalExpensesCents: number;
  userBalanceCents?: number;
  sortieTitle?: string;
  style?: ViewStyle;
  testID?: string;
}

export const FinancesSummaryCard: React.FC<FinancesSummaryCardProps> = ({
  totalExpensesCents,
  userBalanceCents = 0,
  sortieTitle,
  style,
  testID = 'finances-summary-card',
}) => {
  const isCreditor = userBalanceCents > 0;
  const isDebtor = userBalanceCents < 0;

  const getBadgeStyle = () => {
    if (isCreditor) return styles.badgePositive;
    if (isDebtor) return styles.badgeNegative;
    return styles.badgeSettled;
  };

  const getBadgeTextStyle = () => {
    if (isCreditor) return styles.badgeTextPositive;
    if (isDebtor) return styles.badgeTextNegative;
    return styles.badgeTextSettled;
  };

  const getBalanceStatusText = () => {
    if (isCreditor) {
      return `On vous doit +${formatCentsToEuros(userBalanceCents)}`;
    }
    if (isDebtor) {
      return `Vous devez ${formatCentsToEuros(Math.abs(userBalanceCents))}`;
    }
    return "Vous êtes à l'équilibre (0,00 €)";
  };

  return (
    <Card style={[styles.card, style]} testID={testID}>
      {sortieTitle ? (
        <Text style={styles.sortieTitle} numberOfLines={1} testID="summary-sortie-title">
          {sortieTitle}
        </Text>
      ) : null}

      <View style={styles.totalRow}>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Dépenses totales du groupe</Text>
          <Text style={styles.totalAmount} testID="summary-total-amount">
            {formatCentsToEuros(totalExpensesCents)}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Votre solde personnel</Text>
        <View style={[styles.badge, getBadgeStyle()]} testID="user-balance-badge">
          <Text style={[styles.badgeText, getBadgeTextStyle()]} testID="user-balance-text">
            {getBalanceStatusText()}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeNegative: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
  },
  badgePositive: {
    backgroundColor: colors.successBackground,
    borderColor: colors.success,
  },
  badgeSettled: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
  },
  badgeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  badgeTextNegative: {
    color: colors.error,
  },
  badgeTextPositive: {
    color: colors.success,
  },
  badgeTextSettled: {
    color: colors.textSecondary,
  },
  balanceContainer: {
    marginTop: spacing.xs,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: spacing.sm,
  },
  sortieTitle: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  totalAmount: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.xs,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  totalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
