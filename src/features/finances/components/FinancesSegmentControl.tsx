import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@/shared/constants/theme';

export type FinancesSegment = 'expenses' | 'balances';

export interface FinancesSegmentControlProps {
  selectedSegment: FinancesSegment;
  onSelectSegment: (segment: FinancesSegment) => void;
  expensesCount?: number;
  transfersCount?: number;
  style?: ViewStyle;
  testID?: string;
}

export const FinancesSegmentControl: React.FC<FinancesSegmentControlProps> = ({
  selectedSegment,
  onSelectSegment,
  expensesCount,
  transfersCount,
  style,
  testID = 'finances-segment-control',
}) => {
  const isExpenses = selectedSegment === 'expenses';
  const isBalances = selectedSegment === 'balances';

  return (
    <View style={[styles.container, style]} testID={testID}>
      <TouchableOpacity
        style={[styles.segmentButton, isExpenses && styles.segmentButtonActive]}
        onPress={() => onSelectSegment('expenses')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: isExpenses }}
        testID="segment-button-expenses"
      >
        <Text style={[styles.segmentText, isExpenses && styles.segmentTextActive]}>
          Dépenses {expensesCount !== undefined ? `(${expensesCount})` : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segmentButton, isBalances && styles.segmentButtonActive]}
        onPress={() => onSelectSegment('balances')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: isBalances }}
        testID="segment-button-balances"
      >
        <Text style={[styles.segmentText, isBalances && styles.segmentTextActive]}>
          Équilibre & Dettes {transfersCount !== undefined && transfersCount > 0 ? `(${transfersCount})` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  segmentTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.bold,
  },
});
