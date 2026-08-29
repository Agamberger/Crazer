import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { UserNetBalance } from '../types';
import { formatCentsToEuros } from '../utils/formatters';

export interface BalanceItemProps {
  balance: UserNetBalance;
  userName?: string;
  isCurrentUser?: boolean;
  testID?: string;
}

export const BalanceItem: React.FC<BalanceItemProps> = ({
  balance,
  userName = 'Participant',
  isCurrentUser = false,
  testID,
}) => {
  const isPositive = balance.netBalanceCents > 0;
  const isNegative = balance.netBalanceCents < 0;

  const initials = (userName || 'P')
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getNetTextStyle = () => {
    if (isPositive) return styles.netPositive;
    if (isNegative) return styles.netNegative;
    return styles.netSettled;
  };

  const getFormattedNetBalance = () => {
    if (isPositive) {
      return `+${formatCentsToEuros(balance.netBalanceCents)}`;
    }
    return formatCentsToEuros(balance.netBalanceCents);
  };

  return (
    <View
      style={styles.container}
      testID={testID || `balance-item-${balance.userId}`}
    >
      <View style={[styles.avatarCircle, isCurrentUser && styles.avatarCircleUser]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.centerInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1} testID="balance-user-name">
            {userName}
          </Text>
          {isCurrentUser ? (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>Toi</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.breakdownText}>
          Payé : {formatCentsToEuros(balance.totalPaidCents)} • Dû : {formatCentsToEuros(balance.totalOwedCents)}
        </Text>
      </View>

      <View style={styles.rightInfo}>
        <Text style={[styles.netAmount, getNetTextStyle()]} testID="balance-net-amount">
          {getFormattedNetBalance()}
        </Text>
        <Text style={styles.statusSubtext}>
          {isPositive ? 'à recevoir' : isNegative ? 'à régler' : 'équilibré'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 40,
  },
  avatarCircleUser: {
    borderColor: colors.primary,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  breakdownText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  centerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.xs + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  netAmount: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  netNegative: {
    color: colors.error,
  },
  netPositive: {
    color: colors.success,
  },
  netSettled: {
    color: colors.textMuted,
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  statusSubtext: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  youBadge: {
    backgroundColor: colors.primaryDark,
    borderRadius: 6,
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  youBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
});
