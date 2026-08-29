import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/features/auth';
import {
  AddExpenseModal,
  BalancesView,
  CreateExpenseInput,
  CreateSettlementInput,
  Expense,
  ExpenseList,
  FinancesSegment,
  FinancesSegmentControl,
  FinancesSummaryCard,
  SettleDebtModal,
  SortieSelectorHeader,
  SuggestedTransfer,
  useFinances,
} from '@/features/finances';
import { useSortiesStore } from '@/features/sorties';
import { colors, spacing, typography } from '@/shared/constants/theme';

// Noms d'affichage par défaut des participants pour une expérience utilisateur conviviale
const DEFAULT_PARTICIPANT_NAMES: Record<string, string> = {
  'user-1': 'Alexandre (Créateur)',
  'user-2': 'Sophie Dupont',
  'user-3': 'Lucas Moreau',
  'user-4': 'Emma Bernard',
  'user-5': 'Thomas Martin',
};

export default function FinancesScreen() {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || 'user-1';

  const sorties = useSortiesStore((state) => state.sorties);
  const selectedSortieId = useSortiesStore((state) => state.selectedSortieId);
  const selectSortie = useSortiesStore((state) => state.selectSortie);

  const activeSortie = sorties.find((s) => s.id === selectedSortieId) || sorties[0];
  const activeSortieId = activeSortie?.id || null;

  // Calcul de la liste des participants de la sortie active
  const participantIds = useMemo(() => {
    if (!activeSortie) return [currentUserId];
    const set = new Set<string>([activeSortie.creatorId, ...(activeSortie.participantIds || [])]);
    if (currentUserId) set.add(currentUserId);
    return Array.from(set);
  }, [activeSortie, currentUserId]);

  const participantNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = { ...DEFAULT_PARTICIPANT_NAMES };
    if (user?.fullName) {
      map[currentUserId] = `${user.fullName} (Toi)`;
    } else {
      map[currentUserId] = 'Moi';
    }
    return map;
  }, [user, currentUserId]);

  const participantsList = useMemo(() => {
    return participantIds.map((id) => ({
      id,
      name: participantNames[id] || `Participant (${id.slice(0, 6)})`,
    }));
  }, [participantIds, participantNames]);

  // Hook finances réactif
  const {
    expenses,
    settlements,
    balances,
    suggestedTransfers,
    totalExpensesCents,
    getUserBalance,
    isLoading,
    error,
    createExpense,
    deleteExpense,
    createSettlement,
    deleteSettlement,
    fetchFinances,
  } = useFinances({
    sortieId: activeSortieId,
    participantIds,
    autoFetch: true,
  });

  const [selectedSegment, setSelectedSegment] = useState<FinancesSegment>('expenses');
  const [isAddExpenseModalVisible, setIsAddExpenseModalVisible] = useState(false);
  const [isSettleModalVisible, setIsSettleModalVisible] = useState(false);
  const [selectedTransferForSettle, setSelectedTransferForSettle] =
    useState<SuggestedTransfer | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Synchronisation initiale de la sortie active
  useEffect(() => {
    if (!selectedSortieId && sorties.length > 0) {
      selectSortie(sorties[0].id);
    }
  }, [selectedSortieId, sorties, selectSortie]);

  const handleRefresh = async () => {
    if (!activeSortieId) return;
    setRefreshing(true);
    try {
      await fetchFinances(activeSortieId);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsAddExpenseModalVisible(true);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddExpenseModalVisible(true);
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Supprimer la dépense',
      'Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expenseId);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Erreur de suppression';
              Alert.alert('Erreur', msg);
            }
          },
        },
      ]
    );
  };

  const handleOpenSettle = (transfer?: SuggestedTransfer) => {
    setSelectedTransferForSettle(transfer || null);
    setIsSettleModalVisible(true);
  };

  const handleDeleteSettlement = (settlementId: string) => {
    Alert.alert(
      'Supprimer le remboursement',
      'Êtes-vous sûr de vouloir annuler ce remboursement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSettlement(settlementId);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Erreur de suppression';
              Alert.alert('Erreur', msg);
            }
          },
        },
      ]
    );
  };

  const handleCreateExpenseSubmit = async (data: CreateExpenseInput) => {
    await createExpense(data);
  };

  const handleCreateSettlementSubmit = async (data: CreateSettlementInput) => {
    await createSettlement(data);
  };

  const userBalanceCents = getUserBalance(currentUserId);

  if (!activeSortie) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.noSortieContainer} testID="no-active-sortie-view">
          <Ionicons name="wallet-outline" size={64} color={colors.textMuted} />
          <Text style={styles.noSortieTitle}>Aucune sortie sélectionnée</Text>
          <Text style={styles.noSortieSubtitle}>
            Sélectionnez ou créez une sortie dans l&apos;onglet Sorties pour gérer les dépenses de groupe.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} testID="finances-screen">
      {/* En-tête de sélection de sortie */}
      <SortieSelectorHeader
        sorties={sorties.map((s) => ({ id: s.id, title: s.title }))}
        selectedSortieId={activeSortieId}
        onSelectSortie={selectSortie}
      />

      {/* Hero Card Résumé Financier */}
      <View style={styles.summaryContainer}>
        <FinancesSummaryCard
          totalExpensesCents={totalExpensesCents}
          userBalanceCents={userBalanceCents}
          sortieTitle={activeSortie.title}
        />
      </View>

      {/* Segment Control (Dépenses vs Équilibre) */}
      <View style={styles.segmentContainer}>
        <FinancesSegmentControl
          selectedSegment={selectedSegment}
          onSelectSegment={setSelectedSegment}
          expensesCount={expenses.length}
          transfersCount={suggestedTransfers.length}
        />
      </View>

      {/* Affichage d'erreur globale si présente */}
      {error ? (
        <View style={styles.errorBanner} testID="global-finances-error">
          <Ionicons name="alert-circle" size={16} color={colors.error} style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Indicateur de chargement initial */}
      {isLoading && expenses.length === 0 ? (
        <View style={styles.loaderContainer} testID="finances-loader">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des finances...</Text>
        </View>
      ) : (
        <View style={styles.contentArea}>
          {selectedSegment === 'expenses' ? (
            <ExpenseList
              expenses={expenses}
              currentUserId={currentUserId}
              participantNames={participantNames}
              onPressExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddExpense={handleOpenAddExpense}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          ) : (
            <BalancesView
              balances={balances}
              suggestedTransfers={suggestedTransfers}
              settlements={settlements}
              participantNames={participantNames}
              currentUserId={currentUserId}
              onSettleTransfer={handleOpenSettle}
              onDeleteSettlement={handleDeleteSettlement}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          )}
        </View>
      )}

      {/* Floating Action Button (FAB) Ajout de Dépense */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAddExpense}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Ajouter une dépense"
        testID="fab-add-expense"
      >
        <Ionicons name="add" size={28} color={colors.white} />
        <Text style={styles.fabText}>Dépense</Text>
      </TouchableOpacity>

      {/* Modal Ajout / Modification de Dépense */}
      {isAddExpenseModalVisible && activeSortieId ? (
        <AddExpenseModal
          visible={isAddExpenseModalVisible}
          onClose={() => {
            setIsAddExpenseModalVisible(false);
            setEditingExpense(null);
          }}
          onSubmit={handleCreateExpenseSubmit}
          sortieId={activeSortieId}
          currentUserId={currentUserId}
          participants={participantsList}
          initialExpense={editingExpense}
        />
      ) : null}

      {/* Modal Règlement de Dette */}
      {isSettleModalVisible && activeSortieId ? (
        <SettleDebtModal
          visible={isSettleModalVisible}
          onClose={() => {
            setIsSettleModalVisible(false);
            setSelectedTransferForSettle(null);
          }}
          onSubmit={handleCreateSettlementSubmit}
          sortieId={activeSortieId}
          initialTransfer={selectedTransferForSettle}
          participants={participantsList}
          currentUserId={currentUserId}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contentArea: {
    flex: 1,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.errorBackground,
    borderColor: colors.error,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.xs + 4,
  },
  errorIcon: {
    marginRight: spacing.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSizes.xs,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 28,
    bottom: spacing.lg,
    elevation: 6,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    color: colors.white,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    marginLeft: spacing.xs,
  },
  loaderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
    marginTop: spacing.sm,
  },
  noSortieContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  noSortieSubtitle: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
    lineHeight: 20,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  noSortieTitle: {
    color: colors.textPrimary,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  segmentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  summaryContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});
