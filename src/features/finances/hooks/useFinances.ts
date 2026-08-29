/**
 * Custom React Hook encapsulant l'accès au store de finances partagées.
 *
 * Fournit une API propre et réactive pour les composants UI :
 * - Gestion du chargement automatique selon l'id de la sortie
 * - Sélecteurs mémoïsés pour les soldes et suggestions de virement
 * - Actions de mutation asynchrones
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useFinancesStore } from '../store/useFinancesStore';
import {
  Expense,
  Settlement,
  UserNetBalance,
  SuggestedTransfer,
  CreateExpenseInput,
  CreateSettlementInput,
} from '../types';
import { calculateNetBalances, simplifyDebts } from '../utils/financialMath';

export interface UseFinancesOptions {
  sortieId?: string | null;
  participantIds?: string[];
  autoFetch?: boolean;
}

export interface UseFinancesReturn {
  // State
  expenses: Expense[];
  settlements: Settlement[];
  activeSortieId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed & Selectors
  balances: Record<string, UserNetBalance>;
  suggestedTransfers: SuggestedTransfer[];
  totalExpensesCents: number;
  getUserBalance: (userId: string) => number;
  getUserNetBalance: (userId: string) => UserNetBalance | undefined;

  // Actions
  fetchFinances: (sortieId: string) => Promise<void>;
  createExpense: (data: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  createSettlement: (data: CreateSettlementInput) => Promise<Settlement>;
  deleteSettlement: (id: string) => Promise<void>;
  setActiveSortieId: (sortieId: string | null) => void;
  reset: () => void;
  clearError: () => void;
}

/**
 * Hook d'accès aux finances d'une sortie.
 *
 * @param options - Options de configuration (sortieId, participantIds, autoFetch)
 */
export function useFinances(options?: UseFinancesOptions): UseFinancesReturn {
  const { sortieId, participantIds, autoFetch = true } = options || {};

  const expenses = useFinancesStore((state) => state.expenses);
  const settlements = useFinancesStore((state) => state.settlements);
  const activeSortieId = useFinancesStore((state) => state.activeSortieId);
  const isLoading = useFinancesStore((state) => state.isLoading);
  const error = useFinancesStore((state) => state.error);

  const fetchFinances = useFinancesStore((state) => state.fetchFinances);
  const createExpense = useFinancesStore((state) => state.createExpense);
  const updateExpense = useFinancesStore((state) => state.updateExpense);
  const deleteExpense = useFinancesStore((state) => state.deleteExpense);
  const createSettlement = useFinancesStore((state) => state.createSettlement);
  const deleteSettlement = useFinancesStore((state) => state.deleteSettlement);
  const setActiveSortieId = useFinancesStore((state) => state.setActiveSortieId);
  const reset = useFinancesStore((state) => state.reset);
  const clearError = useFinancesStore((state) => state.clearError);

  useEffect(() => {
    if (autoFetch && sortieId && sortieId !== activeSortieId) {
      fetchFinances(sortieId).catch(() => {
        // L'erreur est capturée dans l'état global du store
      });
    }
  }, [sortieId, activeSortieId, autoFetch, fetchFinances]);

  const balances = useMemo(() => {
    let allParticipants = participantIds ? [...participantIds] : [];
    if (!participantIds || participantIds.length === 0) {
      const userSet = new Set<string>();
      for (const exp of expenses) {
        if (exp.payerId) userSet.add(exp.payerId);
        if (exp.payers) {
          for (const p of exp.payers) userSet.add(p.userId);
        }
        if (exp.splits) {
          for (const s of exp.splits) userSet.add(s.userId);
        }
      }
      for (const setl of settlements) {
        if (setl.payerId) userSet.add(setl.payerId);
        if (setl.recipientId) userSet.add(setl.recipientId);
      }
      allParticipants = Array.from(userSet);
    }
    return calculateNetBalances(expenses, settlements, allParticipants);
  }, [expenses, settlements, participantIds]);

  const suggestedTransfers = useMemo(() => {
    return simplifyDebts(balances);
  }, [balances]);

  const totalExpensesCents = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amountCents, 0);
  }, [expenses]);

  const getUserBalance = useCallback(
    (userId: string): number => {
      return balances[userId]?.netBalanceCents ?? 0;
    },
    [balances]
  );

  const getUserNetBalance = useCallback(
    (userId: string): UserNetBalance | undefined => {
      return balances[userId];
    },
    [balances]
  );

  return {
    expenses,
    settlements,
    activeSortieId,
    isLoading,
    error,
    balances,
    suggestedTransfers,
    totalExpensesCents,
    getUserBalance,
    getUserNetBalance,
    fetchFinances,
    createExpense,
    updateExpense,
    deleteExpense,
    createSettlement,
    deleteSettlement,
    setActiveSortieId,
    reset,
    clearError,
  };
}
