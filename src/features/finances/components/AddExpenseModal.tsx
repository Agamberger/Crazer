import React, { useEffect, useMemo, useState } from 'react';
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
import {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  SplitType,
} from '../types';
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
} from '../utils/financialMath';
import { formatCentsToEuros, parseEurosToCents } from '../utils/formatters';
import { CategoryPicker } from './CategoryPicker';
import { ParticipantSplitRow } from './ParticipantSplitRow';
import { SplitModeSelector } from './SplitModeSelector';

export interface AddExpenseParticipant {
  id: string;
  name: string;
}

export interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (expenseData: CreateExpenseInput) => Promise<void>;
  sortieId: string;
  currentUserId: string;
  participants: AddExpenseParticipant[];
  initialExpense?: Expense | null;
  testID?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  sortieId,
  currentUserId,
  participants,
  initialExpense,
  testID = 'add-expense-modal',
}) => {
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('restaurant');
  const [payerId, setPayerId] = useState(currentUserId || (participants[0]?.id ?? ''));
  const [splitMode, setSplitMode] = useState<SplitType>('equal');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // État de sélection des participants
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});
  // Valeurs personnalisées (montant en centimes pour exact, pourcentage pour percentage, nb parts pour shares)
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialisation ou réinitialisation des états à l'ouverture
  useEffect(() => {
    if (visible) {
      if (initialExpense) {
        setTitle(initialExpense.title);
        setAmountStr((initialExpense.amountCents / 100).toString());
        setCategory(initialExpense.category);
        setPayerId(initialExpense.payerId);
        setSplitMode(initialExpense.splitType);
        setDate(initialExpense.date ? initialExpense.date.split('T')[0] : new Date().toISOString().split('T')[0]);

        const selectedMap: Record<string, boolean> = {};
        const valuesMap: Record<string, number> = {};

        for (const p of participants) {
          const split = initialExpense.splits.find((s) => s.userId === p.id);
          selectedMap[p.id] = !!split;
          if (split) {
            if (initialExpense.splitType === 'exact') {
              valuesMap[p.id] = split.amountCents;
            } else if (initialExpense.splitType === 'percentage') {
              valuesMap[p.id] = split.percentage ?? 0;
            } else if (initialExpense.splitType === 'shares') {
              valuesMap[p.id] = split.shares ?? 1;
            }
          }
        }
        setSelectedParticipants(selectedMap);
        setCustomValues(valuesMap);
      } else {
        setTitle('');
        setAmountStr('');
        setCategory('restaurant');
        setPayerId(currentUserId || (participants[0]?.id ?? ''));
        setSplitMode('equal');
        setDate(new Date().toISOString().split('T')[0]);

        const initialSelected: Record<string, boolean> = {};
        const initialCustom: Record<string, number> = {};
        for (const p of participants) {
          initialSelected[p.id] = true;
          initialCustom[p.id] = 1;
        }
        setSelectedParticipants(initialSelected);
        setCustomValues(initialCustom);
      }
      setFormError(null);
    }
  }, [visible, initialExpense, participants, currentUserId]);

  const totalAmountCents = useMemo(() => {
    return parseEurosToCents(amountStr);
  }, [amountStr]);

  const activeBeneficiaryIds = useMemo(() => {
    return participants.filter((p) => selectedParticipants[p.id]).map((p) => p.id);
  }, [participants, selectedParticipants]);

  // Calculs dynamiques de répartition selon le mode choisi
  const computedSplitsMap = useMemo<Map<string, number>>(() => {
    if (activeBeneficiaryIds.length === 0 || totalAmountCents <= 0) {
      return new Map();
    }

    if (splitMode === 'equal') {
      return calculateEqualSplit(totalAmountCents, activeBeneficiaryIds);
    }

    if (splitMode === 'exact') {
      const map = new Map<string, number>();
      for (const id of activeBeneficiaryIds) {
        map.set(id, customValues[id] || 0);
      }
      return map;
    }

    if (splitMode === 'percentage') {
      const percentages = activeBeneficiaryIds.map((id) => ({
        userId: id,
        percentage: customValues[id] || 0,
      }));
      return calculatePercentageSplit(totalAmountCents, percentages);
    }

    if (splitMode === 'shares') {
      const shares = activeBeneficiaryIds.map((id) => ({
        userId: id,
        shares: customValues[id] || 1,
      }));
      return calculateSharesSplit(totalAmountCents, shares);
    }

    return new Map();
  }, [activeBeneficiaryIds, totalAmountCents, splitMode, customValues]);

  // Validation en direct de la répartition
  const validationStatus = useMemo(() => {
    if (totalAmountCents <= 0) {
      return { isValid: false, message: 'Veuillez saisir un montant supérieur à 0.' };
    }

    if (activeBeneficiaryIds.length === 0) {
      return { isValid: false, message: 'Veuillez sélectionner au moins un participant.' };
    }

    if (splitMode === 'exact') {
      const sumExact = activeBeneficiaryIds.reduce((sum, id) => sum + (customValues[id] || 0), 0);
      const diff = totalAmountCents - sumExact;
      if (diff !== 0) {
        return {
          isValid: false,
          message:
            diff > 0
              ? `Reste à répartir : ${formatCentsToEuros(diff)}`
              : `Dépassement de : ${formatCentsToEuros(Math.abs(diff))}`,
        };
      }
    }

    if (splitMode === 'percentage') {
      const sumPerc = activeBeneficiaryIds.reduce(
        (sum, id) => sum + (customValues[id] || 0),
        0
      );
      const diff = Math.round((100 - sumPerc) * 100) / 100;
      if (Math.abs(diff) > 0.01) {
        return {
          isValid: false,
          message: `Total des pourcentages : ${sumPerc}% (doit être 100%)`,
        };
      }
    }

    if (splitMode === 'shares') {
      const totalShares = activeBeneficiaryIds.reduce(
        (sum, id) => sum + (customValues[id] || 1),
        0
      );
      if (totalShares <= 0) {
        return { isValid: false, message: 'Le total des parts doit être supérieur à 0.' };
      }
    }

    return { isValid: true, message: 'Répartition équilibrée' };
  }, [totalAmountCents, activeBeneficiaryIds, splitMode, customValues]);

  const handleSubmit = async () => {
    setFormError(null);

    if (!title.trim()) {
      setFormError('Veuillez saisir un titre pour la dépense.');
      return;
    }

    if (!totalAmountCents || totalAmountCents <= 0) {
      setFormError('Veuillez saisir un montant valide.');
      return;
    }

    if (!validationStatus.isValid) {
      setFormError(validationStatus.message);
      return;
    }

    if (!payerId) {
      setFormError('Veuillez sélectionner le payeur.');
      return;
    }

    // Construction du tableau de répartition ExpenseSplit[]
    const finalSplits: ExpenseSplit[] = activeBeneficiaryIds.map((userId) => {
      const splitAmount = computedSplitsMap.get(userId) || 0;
      const splitObj: ExpenseSplit = {
        userId,
        amountCents: splitAmount,
      };

      if (splitMode === 'percentage') {
        splitObj.percentage = customValues[userId] || 0;
      } else if (splitMode === 'shares') {
        splitObj.shares = customValues[userId] || 1;
      }

      return splitObj;
    });

    const expensePayload: CreateExpenseInput = {
      sortieId,
      title: title.trim(),
      amountCents: totalAmountCents,
      payerId,
      splitType: splitMode,
      category,
      date: new Date(date).toISOString(),
      createdBy: currentUserId,
      splits: finalSplits,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(expensePayload);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la dépense.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            testID="btn-close-expense-modal"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {initialExpense ? 'Modifier la dépense' : 'Ajouter une dépense'}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {formError ? (
            <View style={styles.errorBanner} testID="expense-form-error">
              <Ionicons name="alert-circle" size={18} color={colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {/* Titre */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Titre de la dépense</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Restaurant Le Bistrot, Courses..."
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              testID="input-expense-title"
            />
          </View>

          {/* Montant */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Montant total (€)</Text>
            <View style={styles.amountInputWrapper}>
              <TextInput
                style={styles.amountInput}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="decimal-pad"
                testID="input-expense-amount"
              />
              <Text style={styles.currencySymbol}>€</Text>
            </View>
          </View>

          {/* Catégorie */}
          <CategoryPicker selectedCategory={category} onSelectCategory={setCategory} />

          {/* Payeur */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Payé par</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.payerScroll}>
              {participants.map((p) => {
                const isSelectedPayer = p.id === payerId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.payerChip, isSelectedPayer && styles.payerChipSelected]}
                    onPress={() => setPayerId(p.id)}
                    testID={`payer-option-${p.id}`}
                  >
                    <Text
                      style={[styles.payerChipText, isSelectedPayer && styles.payerChipTextSelected]}
                    >
                      {p.name} {p.id === currentUserId ? '(Toi)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date (AAAA-MM-JJ)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="2026-08-17"
              placeholderTextColor={colors.textMuted}
              value={date}
              onChangeText={setDate}
              testID="input-expense-date"
            />
          </View>

          {/* Sélecteur de mode de répartition */}
          <SplitModeSelector selectedMode={splitMode} onSelectMode={setSplitMode} />

          {/* Indicateur de validation de la répartition */}
          <View
            style={[
              styles.validationBadge,
              validationStatus.isValid
                ? styles.validationBadgeValid
                : styles.validationBadgeInvalid,
            ]}
            testID="split-validation-badge"
          >
            <Ionicons
              name={validationStatus.isValid ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={validationStatus.isValid ? colors.success : colors.error}
              style={styles.validationIcon}
            />
            <Text
              style={[
                styles.validationText,
                validationStatus.isValid
                  ? styles.validationTextValid
                  : styles.validationTextInvalid,
              ]}
            >
              {validationStatus.message}
            </Text>
          </View>

          {/* Liste des participants et répartition */}
          <View style={styles.participantsSection}>
            <Text style={styles.fieldLabel}>Participants concernés</Text>
            {participants.map((p) => (
              <ParticipantSplitRow
                key={p.id}
                userId={p.id}
                userName={p.name}
                splitMode={splitMode}
                isSelected={!!selectedParticipants[p.id]}
                onToggleSelect={(sel) =>
                  setSelectedParticipants((prev) => ({ ...prev, [p.id]: sel }))
                }
                customValue={customValues[p.id] || 0}
                onChangeValue={(val) =>
                  setCustomValues((prev) => ({ ...prev, [p.id]: val }))
                }
                computedAmountCents={computedSplitsMap.get(p.id) || 0}
                isCurrentUser={p.id === currentUserId}
              />
            ))}
          </View>
        </ScrollView>

        {/* Bouton de validation Footer */}
        <View style={styles.footer}>
          <Button
            title={initialExpense ? 'Mettre à jour la dépense' : 'Enregistrer la dépense'}
            variant="primary"
            loading={isSubmitting}
            disabled={!title.trim() || totalAmountCents <= 0 || !validationStatus.isValid}
            onPress={handleSubmit}
            testID="btn-submit-expense"
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
  participantsSection: {
    marginTop: spacing.md,
  },
  payerChip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  payerChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  payerChipText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  payerChipTextSelected: {
    color: colors.white,
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
  validationBadge: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  validationBadgeInvalid: {
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
  },
  validationBadgeValid: {
    backgroundColor: colors.successBackground,
    borderColor: colors.success,
  },
  validationIcon: {
    marginRight: spacing.xs,
  },
  validationText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  validationTextInvalid: {
    color: colors.error,
  },
  validationTextValid: {
    color: colors.success,
  },
});
