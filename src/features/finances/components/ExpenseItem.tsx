import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Expense, EXPENSE_CATEGORIES, SplitType } from '../types';
import { formatCentsToEuros, formatDate } from '../utils/formatters';

export interface ExpenseItemProps {
  expense: Expense;
  currentUserId?: string;
  participantNames?: Record<string, string>;
  onPress?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
  testID?: string;
}

const SPLIT_LABELS: Record<SplitType, string> = {
  equal: 'Égale',
  exact: 'Montants',
  percentage: 'Pourcentages',
  shares: 'Parts',
};

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  expense,
  currentUserId,
  participantNames = {},
  onPress,
  onDelete,
  testID,
}) => {
  const categoryInfo = EXPENSE_CATEGORIES.find((c) => c.id === expense.category);
  const iconName = (categoryInfo?.iconName || 'receipt-outline') as keyof typeof Ionicons.glyphMap;

  const isUserPayer = currentUserId && expense.payerId === currentUserId;
  const payerName = isUserPayer
    ? 'Toi'
    : participantNames[expense.payerId] || 'Un participant';

  const userSplit = currentUserId
    ? expense.splits.find((s) => s.userId === currentUserId)
    : undefined;

  const splitLabel = SPLIT_LABELS[expense.splitType] || 'Égale';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(expense)}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole="button"
      testID={testID || `expense-item-${expense.id}`}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={iconName} size={22} color={colors.primary} />
      </View>

      <View style={styles.centerContent}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1} testID="expense-item-title">
            {expense.title}
          </Text>
          <View style={styles.splitBadge}>
            <Text style={styles.splitBadgeText}>{splitLabel}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.payerText} numberOfLines={1}>
            Payé par <Text style={styles.payerHighlight}>{payerName}</Text>
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.dateText}>{formatDate(expense.date)}</Text>
        </View>

        {userSplit ? (
          <Text style={styles.userPartText} testID="expense-user-part">
            Ta part : {formatCentsToEuros(userSplit.amountCents)}
          </Text>
        ) : (
          <Text style={styles.userPartExcluded}>Non concerné</Text>
        )}
      </View>

      <View style={styles.rightContent}>
        <Text style={styles.amount} testID="expense-item-amount">
          {formatCentsToEuros(expense.amountCents)}
        </Text>

        {onDelete ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(expense.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Supprimer la dépense"
            testID={`btn-delete-expense-${expense.id}`}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  amount: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  centerContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  dateText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
  },
  deleteButton: {
    marginTop: spacing.xs,
    padding: spacing.xs,
  },
  dotSeparator: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginHorizontal: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },
  payerHighlight: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  payerText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  splitBadge: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 6,
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  splitBadgeText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
  },
  title: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userPartExcluded: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  userPartText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    marginTop: 2,
  },
});
