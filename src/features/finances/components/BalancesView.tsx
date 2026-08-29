import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { Settlement, SuggestedTransfer, UserNetBalance } from '../types';
import { formatCentsToEuros, formatDate } from '../utils/formatters';
import { BalanceItem } from './BalanceItem';
import { SettlementSuggestionCard } from './SettlementSuggestionCard';

export interface BalancesViewProps {
  balances: Record<string, UserNetBalance>;
  suggestedTransfers: SuggestedTransfer[];
  settlements?: Settlement[];
  participantNames?: Record<string, string>;
  currentUserId?: string;
  onSettleTransfer?: (transfer: SuggestedTransfer) => void;
  onDeleteSettlement?: (settlementId: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  testID?: string;
}

export const BalancesView: React.FC<BalancesViewProps> = ({
  balances,
  suggestedTransfers,
  settlements = [],
  participantNames = {},
  currentUserId,
  onSettleTransfer,
  onDeleteSettlement,
  onRefresh,
  refreshing = false,
  testID = 'balances-view-container',
}) => {
  const balanceList = Object.values(balances);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      testID={testID}
    >
      {/* 1. Section Simplification des dettes (Virements optimisés) */}
      <View style={styles.section} testID="transfers-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="swap-horizontal" size={18} color={colors.primary} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Remboursements suggérés</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Nombre minimal de virements calculé par l&apos;algorithme de simplification.
        </Text>

        {suggestedTransfers.length > 0 ? (
          suggestedTransfers.map((transfer, index) => (
            <SettlementSuggestionCard
              key={`${transfer.fromUserId}-${transfer.toUserId}-${index}`}
              transfer={transfer}
              payerName={participantNames[transfer.fromUserId]}
              recipientName={participantNames[transfer.toUserId]}
              currentUserId={currentUserId}
              onSettle={onSettleTransfer}
            />
          ))
        ) : (
          <View style={styles.allSettledBanner} testID="all-settled-banner">
            <Ionicons name="checkmark-circle" size={24} color={colors.success} style={styles.settledIcon} />
            <Text style={styles.allSettledText}>
              Tout le monde est à l&apos;équilibre ! Aucun remboursement en attente. 🎉
            </Text>
          </View>
        )}
      </View>

      {/* 2. Section Soldes Individuels */}
      <View style={styles.section} testID="balances-section">
        <View style={styles.sectionHeader}>
          <Ionicons name="people-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
          <Text style={styles.sectionTitle}>Soldes des participants</Text>
        </View>

        {balanceList.length > 0 ? (
          balanceList.map((balance) => (
            <BalanceItem
              key={balance.userId}
              balance={balance}
              userName={participantNames[balance.userId] || `Membre (${balance.userId})`}
              isCurrentUser={currentUserId === balance.userId}
            />
          ))
        ) : (
          <Text style={styles.emptyText}>Aucun participant dans cette sortie.</Text>
        )}
      </View>

      {/* 3. Section Historique des Règlements */}
      {settlements.length > 0 ? (
        <View style={styles.section} testID="settlements-history-section">
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Historique des remboursements</Text>
          </View>

          {settlements.map((settlement) => {
            const payer = participantNames[settlement.payerId] || settlement.payerId;
            const recipient = participantNames[settlement.recipientId] || settlement.recipientId;

            return (
              <View
                key={settlement.id}
                style={styles.settlementRow}
                testID={`settlement-row-${settlement.id}`}
              >
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementText}>
                    <Text style={styles.boldText}>{payer}</Text> a remboursé{' '}
                    <Text style={styles.boldText}>{recipient}</Text>
                  </Text>
                  <Text style={styles.settlementDate}>
                    {formatDate(settlement.date)} {settlement.notes ? `• ${settlement.notes}` : ''}
                  </Text>
                </View>

                <View style={styles.settlementRight}>
                  <Text style={styles.settlementAmount}>
                    {formatCentsToEuros(settlement.amountCents)}
                  </Text>
                  {onDeleteSettlement ? (
                    <TouchableOpacity
                      onPress={() => onDeleteSettlement(settlement.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Supprimer le remboursement"
                      testID={`btn-delete-settlement-${settlement.id}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  allSettledBanner: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderColor: colors.success,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  allSettledText: {
    color: colors.success,
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
  },
  boldText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    marginVertical: spacing.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 2,
  },
  sectionIcon: {
    marginRight: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  settledIcon: {
    marginRight: spacing.sm,
  },
  settlementAmount: {
    color: colors.success,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginRight: spacing.sm,
  },
  settlementDate: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.xs,
    marginTop: 2,
  },
  settlementInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  settlementRight: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  settlementRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  settlementText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
  },
});
