import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { SuggestedTransfer } from '../types';
import { formatCentsToEuros } from '../utils/formatters';

export interface SettlementSuggestionCardProps {
  transfer: SuggestedTransfer;
  payerName?: string;
  recipientName?: string;
  currentUserId?: string;
  onSettle?: (transfer: SuggestedTransfer) => void;
  testID?: string;
}

export const SettlementSuggestionCard: React.FC<SettlementSuggestionCardProps> = ({
  transfer,
  payerName = 'Débiteur',
  recipientName = 'Créancier',
  currentUserId,
  onSettle,
  testID,
}) => {
  const isCurrentUserPayer = currentUserId && transfer.fromUserId === currentUserId;
  const isCurrentUserRecipient = currentUserId && transfer.toUserId === currentUserId;

  const displayPayerName = isCurrentUserPayer ? 'Toi' : payerName;
  const displayRecipientName = isCurrentUserRecipient ? 'Toi' : recipientName;

  const getPayerInitials = (displayPayerName || 'D')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRecipientInitials = (displayRecipientName || 'C')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={styles.card}
      testID={testID || `settlement-suggestion-${transfer.fromUserId}-${transfer.toUserId}`}
    >
      <View style={styles.flowRow}>
        {/* Débiteur (Qui doit) */}
        <View style={styles.userColumn}>
          <View style={[styles.avatar, isCurrentUserPayer && styles.avatarUser]}>
            <Text style={styles.avatarText}>{getPayerInitials}</Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {displayPayerName}
          </Text>
        </View>

        {/* Flèche et Montant */}
        <View style={styles.arrowColumn}>
          <Text style={styles.amountText} testID="transfer-amount">
            {formatCentsToEuros(transfer.amountCents)}
          </Text>
          <View style={styles.arrowRow}>
            <View style={styles.dashLine} />
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </View>

        {/* Créancier (Qui reçoit) */}
        <View style={styles.userColumn}>
          <View style={[styles.avatar, isCurrentUserRecipient && styles.avatarUser]}>
            <Text style={styles.avatarText}>{getRecipientInitials}</Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {displayRecipientName}
          </Text>
        </View>
      </View>

      {/* Bouton d'action Régler */}
      {onSettle ? (
        <TouchableOpacity
          style={styles.settleButton}
          onPress={() => onSettle(transfer)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Régler ${formatCentsToEuros(transfer.amountCents)} de ${displayPayerName} à ${displayRecipientName}`}
          testID={`btn-settle-${transfer.fromUserId}-${transfer.toUserId}`}
        >
          <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} style={styles.btnIcon} />
          <Text style={styles.settleButtonText}>Régler la dette</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  amountText: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
    textAlign: 'center',
  },
  arrowColumn: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  arrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginBottom: spacing.xs,
    width: 36,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  avatarUser: {
    borderColor: colors.primary,
  },
  btnIcon: {
    marginRight: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  dashLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 2,
    marginRight: 2,
  },
  flowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  settleButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  settleButtonText: {
    color: colors.white,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  userColumn: {
    alignItems: 'center',
    width: 80,
  },
  userName: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    textAlign: 'center',
  },
});
