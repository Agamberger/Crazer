/**
 * Store global réactif Zustand pour le module Finances Partagées de Crazer.
 *
 * Gère l'état des dépenses et des règlements de la sortie active,
 * orchestre les appels au service Supabase `financesService`,
 * et expose les sélecteurs de calcul financier dynamique (soldes nets, simplification de dettes).
 */

import { create } from 'zustand';
import {
  Expense,
  Settlement,
  FinancesState,
  UserNetBalance,
  SuggestedTransfer,
  CreateExpenseInput,
  CreateSettlementInput,
} from '../types';
import { financesService } from '../services/financesService';
import { calculateNetBalances, simplifyDebts } from '../utils/financialMath';

export const INITIAL_MOCK_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    sortieId: '1',
    title: 'Smash Burgers & Frites maison',
    amountCents: 6800,
    category: 'restaurant',
    payerId: 'user-1',
    splitType: 'equal',
    date: '2026-07-20T20:15:00Z',
    createdBy: 'user-1',
    createdAt: '2026-07-20T20:15:00Z',
    splits: [
      { userId: 'user-1', amountCents: 1700 },
      { userId: 'user-2', amountCents: 1700 },
      { userId: 'user-3', amountCents: 1700 },
      { userId: 'user-4', amountCents: 1700 },
    ],
    payers: [
      { userId: 'user-1', amountCents: 6800 },
    ],
  },
  {
    id: 'exp-2',
    sortieId: '1',
    title: 'Parties de Bowling & Location Chaussures',
    amountCents: 5200,
    category: 'activite',
    payerId: 'user-2',
    splitType: 'equal',
    date: '2026-07-20T21:45:00Z',
    createdBy: 'user-2',
    createdAt: '2026-07-20T21:45:00Z',
    splits: [
      { userId: 'user-1', amountCents: 1300 },
      { userId: 'user-2', amountCents: 1300 },
      { userId: 'user-3', amountCents: 1300 },
      { userId: 'user-4', amountCents: 1300 },
    ],
    payers: [
      { userId: 'user-2', amountCents: 5200 },
    ],
  },
  {
    id: 'exp-3',
    sortieId: '1',
    title: 'Tournée de Cocktails & Softs',
    amountCents: 4500,
    category: 'bar',
    payerId: 'user-3',
    splitType: 'equal',
    date: '2026-07-20T23:00:00Z',
    createdBy: 'user-3',
    createdAt: '2026-07-20T23:00:00Z',
    splits: [
      { userId: 'user-1', amountCents: 1125 },
      { userId: 'user-2', amountCents: 1125 },
      { userId: 'user-3', amountCents: 1125 },
      { userId: 'user-4', amountCents: 1125 },
    ],
    payers: [
      { userId: 'user-3', amountCents: 4500 },
    ],
  },
  {
    id: 'exp-4',
    sortieId: '1',
    title: 'Uber retour soirée',
    amountCents: 2400,
    category: 'transport',
    payerId: 'user-1',
    splitType: 'exact',
    date: '2026-07-21T00:30:00Z',
    createdBy: 'user-1',
    createdAt: '2026-07-21T00:30:00Z',
    splits: [
      { userId: 'user-1', amountCents: 1200 },
      { userId: 'user-3', amountCents: 1200 },
    ],
    payers: [
      { userId: 'user-1', amountCents: 2400 },
    ],
  },
];

export const INITIAL_MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: 'setl-1',
    sortieId: '1',
    payerId: 'user-4',
    recipientId: 'user-1',
    amountCents: 1500,
    date: '2026-07-21T10:00:00Z',
    notes: 'Remboursement partiel par Lydia',
    createdAt: '2026-07-21T10:00:00Z',
  },
];

/**
 * Interface étendue du store incluant les méthodes de réinitialisation, de gestion d'erreur,
 * et la surcharge optionnelle des sélecteurs avec participantIds.
 */
export interface ExtendedFinancesState
  extends Omit<FinancesState, 'getNetBalances' | 'getSuggestedTransfers'> {
  reset: () => void;
  clearError: () => void;
  getNetBalances: (participantIds?: string[]) => Record<string, UserNetBalance>;
  getSuggestedTransfers: (participantIds?: string[]) => SuggestedTransfer[];
}

export const useFinancesStore = create<ExtendedFinancesState>((set, get) => ({
  expenses: INITIAL_MOCK_EXPENSES,
  settlements: INITIAL_MOCK_SETTLEMENTS,
  activeSortieId: '1',
  isLoading: false,
  error: null,

  /**
   * Définit l'identifiant de la sortie active.
   */
  setActiveSortieId: (sortieId: string | null) => {
    set({ activeSortieId: sortieId });
  },

  /**
   * Charge les dépenses et règlements pour une sortie donnée.
   */
  fetchFinances: async (sortieId: string) => {
    if (!sortieId) return;
    set({ isLoading: true, error: null, activeSortieId: sortieId });
    try {
      const [expenses, settlements] = await Promise.all([
        financesService.fetchExpenses(sortieId),
        financesService.fetchSettlements(sortieId),
      ]);
      set({
        expenses,
        settlements,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la récupération des finances.';
      // En mode développement / hors-ligne sans BDD distante, fallback sur les mockups
      const currentExpenses = get().expenses;
      set({
        expenses: currentExpenses.length > 0 ? currentExpenses : INITIAL_MOCK_EXPENSES,
        settlements: get().settlements.length > 0 ? get().settlements : INITIAL_MOCK_SETTLEMENTS,
        isLoading: false,
        error: message,
      });
      throw err;
    }
  },

  /**
   * Enregistre une nouvelle dépense et l'ajoute au state local.
   */
  createExpense: async (expenseData: CreateExpenseInput): Promise<Expense> => {
    set({ isLoading: true, error: null });
    try {
      const newExpense = await financesService.createExpense(expenseData);
      set((state) => ({
        expenses: [newExpense, ...state.expenses.filter((e) => e.id !== newExpense.id)],
        isLoading: false,
        error: null,
      }));
      return newExpense;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de la dépense.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /**
   * Met à jour une dépense existante dans la BDD et le state local.
   */
  updateExpense: async (id: string, updates: Partial<Expense>): Promise<Expense> => {
    set({ isLoading: true, error: null });
    try {
      const updatedExpense = await financesService.updateExpense(id, updates);
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? updatedExpense : e)),
        isLoading: false,
        error: null,
      }));
      return updatedExpense;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la dépense.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /**
   * Supprime une dépense de la BDD et du state local.
   */
  deleteExpense: async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await financesService.deleteExpense(id);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression de la dépense.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /**
   * Enregistre un remboursement direct et l'ajoute au state local.
   */
  createSettlement: async (settlementData: CreateSettlementInput): Promise<Settlement> => {
    set({ isLoading: true, error: null });
    try {
      const newSettlement = await financesService.createSettlement(settlementData);
      set((state) => ({
        settlements: [
          newSettlement,
          ...state.settlements.filter((s) => s.id !== newSettlement.id),
        ],
        isLoading: false,
        error: null,
      }));
      return newSettlement;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création du remboursement.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /**
   * Supprime un remboursement de la BDD et du state local.
   */
  deleteSettlement: async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await financesService.deleteSettlement(id);
      set((state) => ({
        settlements: state.settlements.filter((s) => s.id !== id),
        isLoading: false,
        error: null,
      }));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la suppression du remboursement.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /**
   * Réinitialise l'état du store.
   */
  reset: () => {
    set({
      expenses: [],
      settlements: [],
      activeSortieId: null,
      isLoading: false,
      error: null,
    });
  },

  /**
   * Efface le message d'erreur courant.
   */
  clearError: () => {
    set({ error: null });
  },

  // --- Computed Getters / Sélecteurs Métier ---

  /**
   * Calcule les soldes nets de tous les participants (ou de la liste passée en paramètre).
   */
  getNetBalances: (participantIds?: string[]): Record<string, UserNetBalance> => {
    const { expenses, settlements } = get();

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
  },

  /**
   * Calcule la liste optimisée des virements de simplification de dettes.
   */
  getSuggestedTransfers: (participantIds?: string[]): SuggestedTransfer[] => {
    const balances = get().getNetBalances(participantIds);
    return simplifyDebts(balances);
  },

  /**
   * Calcule le montant total des dépenses enregistrées en centimes.
   */
  getTotalExpensesCents: (): number => {
    const { expenses } = get();
    return expenses.reduce((sum, e) => sum + e.amountCents, 0);
  },

  /**
   * Récupère le solde net en centimes d'un utilisateur spécifique.
   * (> 0 = créancier, < 0 = débiteur, 0 = équilibré).
   */
  getUserBalanceCents: (userId: string): number => {
    if (!userId) return 0;
    const balances = get().getNetBalances();
    return balances[userId]?.netBalanceCents ?? 0;
  },
}));
