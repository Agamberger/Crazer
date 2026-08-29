import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/shared/components/Button';
import { colors, spacing, typography } from '@/shared/constants/theme';
import { CreateSettlementInput, SuggestedTransfer } from '../types';
import { parseEurosToCents } from '../utils/formatters';

export interface SettleDebtParticipant {
  id: string;
  name: string;
}

export interface SettleDebtModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (settlementData: CreateSettlementInput) => Promise<void>;
  sortieId: string;
  initialTransfer?: SuggestedTransfer | null;
  participants: SettleDebtParticipant[];
  currentUserId?: string;
  testID?: string;
}

export const SettleDebtModal: React.FC<SettleDebtModalProps> = ({
  visible,
  onClose,
  onSubmit,
  sortieId,
  initialTransfer,
  participants,
  currentUserId,
  testID = 'settle-debt-modal',
}) => {
  const [payerId, setPayerId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialTransfer) {
        setPayerId(initialTransfer.fromUserId);
        setRecipientId(initialTransfer.toUserId);
        setAmountStr((initialTransfer.amountCents / 100).toString());
      } else {
        setPayerId(currentUserId || (participants[0]?.id ?? ''));
        setRecipientId(participants[1]?.id ?? (participants[0]?.id ?? ''));
        setAmountStr('');
      }
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setError(null);
    }
  }, [visible, initialTransfer, participants, currentUserId]);

  const handleConfirm = async () => {
    setError(null);

    if (!payerId) {
      setError('Veuillez sélectionner le payeur (qui rembourse).');
      return;
    }
    if (!recipientId) {
      setError('Veuillez sélectionner le bénéficiaire (qui reçoit).');
      return;
    }
    if (payerId === recipientId) {
      setError('Le payeur et le destinataire ne peuvent pas être identiques.');
      return;
    }

    const amountCents = parseEurosToCents(amountStr);
    if (amountCents <= 0) {
      setError('Veuillez saisir un montant strictement supérieur à 0.');
      return;
    }

    const payload: CreateSettlementInput = {
      sortieId,
      payerId,
      recipientId,
      amountCents,
      date: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la confirmation du remboursement.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const payerName = participants.find((p) => p.id === payerId)?.name || 'Payeur';
  const recipientName = participants.find((p) => p.id === recipientId)?.name || 'Destinataire';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Modal */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="btn-close-settle-modal"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rembourser / Régler une dette</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View style={styles.errorBanner} testID="settle-error-banner">
              <Ionicons name="alert-circle" size={18} color={colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Résumé visuel de la transaction */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCaption}>Transfert financier direct</Text>
            <Text style={styles.summaryFlow}>
              <Text style={styles.highlight}>{payerName}</Text> rembourse{' '}
              <Text style={styles.highlight}>{recipientName}</Text>
            </Text>
          </View>

          {/* Payeur (Qui verse le remboursement) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Qui rembourse ? (Débiteur)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
              {participants.map((p) => {
                const isSelected = p.id === payerId;
                return (
                  <TouchableOpacity
                    key={`payer-${p.id}`}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setPayerId(p.id)}
                    testID={`settle-payer-${p.id}`}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {p.name} {p.id === currentUserId ? '(Toi)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Destinataire (Qui reçoit l'argent) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>À qui ? (Créancier)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
              {participants.map((p) => {
                const isSelected = p.id === recipientId;
                return (
                  <TouchableOpacity
                    key={`recipient-${p.id}`}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setRecipientId(p.id)}
                    testID={`settle-recipient-${p.id}`}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {p.name} {p.id === currentUserId ? '(Toi)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Montant */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Montant versé (€)</Text>
            <View style={styles.amountInputWrapper}>
              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                testID="input-settlement-amount"
              />
              <Text style={styles.currencySymbol}>€</Text>
            </View>
          </View>

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date du virement (AAAA-MM-JJ)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2026-08-17"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
              testID="input-settlement-date"
            />
          </View>

          {/* Notes facultatives */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes ou moyen de paiement (Optionnel)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Virement Lydia, PayPal, Espèces..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              testID="input-settlement-notes"
            />
          </View>
        </ScrollView>

        {/* Footer avec Bouton de validation */}
        <View style={styles.footer}>
          <Button
            title="Confirmer le remboursement"
            variant="primary"
            loading={isSubmitting}
            disabled={!amountStr || parseEurosToCents(amountStr) <= 0 || payerId === recipientId}
            onPress={handleConfirm}
            testID="btn-confirm-settlement"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  amountInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
  },
  amountInputWrapper: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  chipTextSelected: {
    color: colors.white,
    fontWeight: typography.fontWeights.bold,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  currencySymbol: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    marginLeft: spacing.xs,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorIcon: {
    marginRight: spacing.xs,
  },
  errorText: {
    color: colors.error,
    flex: 1,
    fontSize: typography.fontSizes.xs,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    marginBottom: spacing.xs,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerRightPlaceholder: {
    width: 24,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  highlight: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  payerScroll: {
    flexDirection: 'row',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  summaryCaption: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.fontWeights.medium,
    textTransform: 'uppercase',
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  summaryFlow: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
});
