/**
 * Service d'accès aux données Supabase pour le module Finances Partagées (Crazer).
 * 
 * Gère les interactions avec les tables Supabase :
 * - `expenses` : Dépenses de la sortie
 * - `expense_payers` : Payeurs et montants (support multi-payeurs)
 * - `expense_splits` : Bénéficiaires et parts/pourcentages
 * - `settlements` : Règlements directs / remboursements
 *
 * Mappe rigoureusement le snake_case PostgreSQL vers le camelCase du domaine TypeScript.
 */

import { supabase } from '@/shared/lib/supabase';
import { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database.types';
import {
  Expense,
  Settlement,
  ExpensePayer,
  ExpenseSplit,
  SplitType,
  ExpenseCategory,
  CreateExpenseInput,
  CreateSettlementInput,
} from '../types';

/**
 * Type interne représentant une ligne de dépense Supabase avec relations jointes
 */
interface ExpenseDbRowWithRelations extends Tables<'expenses'> {
  expense_payers?: Tables<'expense_payers'>[] | null;
  expense_splits?: Tables<'expense_splits'>[] | null;
}

/**
 * Mappe un enregistrement de base de données (avec jointures) vers l'interface métier Expense.
 */
function mapExpenseRowToDomain(row: ExpenseDbRowWithRelations): Expense {
  const payers: ExpensePayer[] = (row.expense_payers || []).map((p) => ({
    userId: p.user_id,
    amountCents: p.amount_cents,
  }));

  const splits: ExpenseSplit[] = (row.expense_splits || []).map((s) => ({
    userId: s.user_id,
    amountCents: s.amount_cents,
    ...(s.percentage !== null && s.percentage !== undefined ? { percentage: s.percentage } : {}),
    ...(s.shares !== null && s.shares !== undefined ? { shares: s.shares } : {}),
  }));

  return {
    id: row.id,
    sortieId: row.sortie_id,
    title: row.title,
    amountCents: row.amount_cents,
    payerId: row.payer_id,
    ...(payers.length > 0 ? { payers } : {}),
    splitType: row.split_type as SplitType,
    category: row.category as ExpenseCategory,
    date: row.date,
    createdBy: row.created_by,
    createdAt: row.created_at,
    splits,
  };
}

/**
 * Mappe un enregistrement de remboursement vers l'interface métier Settlement.
 */
function mapSettlementRowToDomain(row: Tables<'settlements'>): Settlement {
  return {
    id: row.id,
    sortieId: row.sortie_id,
    payerId: row.payer_id,
    recipientId: row.recipient_id,
    amountCents: row.amount_cents,
    date: row.date,
    ...(row.notes ? { notes: row.notes } : {}),
    createdAt: row.created_at,
  };
}

/**
 * Récupère toutes les dépenses associées à une sortie avec leurs payeurs et répartitions.
 *
 * @param sortieId - Identifiant de la sortie
 * @returns Liste ordonnée des dépenses (par date décroissante)
 */
export async function fetchExpenses(sortieId: string): Promise<Expense[]> {
  if (!sortieId) {
    throw new Error('fetchExpenses: sortieId est requis');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
      *,
      expense_payers (
        id,
        expense_id,
        user_id,
        amount_cents,
        created_at
      ),
      expense_splits (
        id,
        expense_id,
        user_id,
        amount_cents,
        percentage,
        shares,
        created_at
      )
    `
    )
    .eq('sortie_id', sortieId)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des dépenses : ${error.message}`);
  }

  return ((data as ExpenseDbRowWithRelations[]) || []).map(mapExpenseRowToDomain);
}

/**
 * Récupère une dépense spécifique par son identifiant avec toutes ses relations.
 *
 * @param id - Identifiant de la dépense
 * @returns Modèle de dépense complet
 */
export async function fetchExpenseById(id: string): Promise<Expense> {
  if (!id) {
    throw new Error('fetchExpenseById: id est requis');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
      *,
      expense_payers (
        id,
        expense_id,
        user_id,
        amount_cents,
        created_at
      ),
      expense_splits (
        id,
        expense_id,
        user_id,
        amount_cents,
        percentage,
        shares,
        created_at
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(`Dépense introuvable (${id}) : ${error?.message || 'Aucune donnée retournée'}`);
  }

  return mapExpenseRowToDomain(data as ExpenseDbRowWithRelations);
}

/**
 * Récupère tous les remboursements / règlements directs associés à une sortie.
 *
 * @param sortieId - Identifiant de la sortie
 * @returns Liste ordonnée des règlements (par date décroissante)
 */
export async function fetchSettlements(sortieId: string): Promise<Settlement[]> {
  if (!sortieId) {
    throw new Error('fetchSettlements: sortieId est requis');
  }

  const { data, error } = await supabase
    .from('settlements')
    .select('*')
    .eq('sortie_id', sortieId)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des remboursements : ${error.message}`);
  }

  return (data || []).map(mapSettlementRowToDomain);
}

/**
 * Crée une nouvelle dépense en insérant l'enregistrement principal ainsi que
 * les payeurs (`expense_payers`) et bénéficiaires (`expense_splits`) associés.
 *
 * @param expenseData - Données de la dépense à créer (sans id ni createdAt)
 * @returns Dépense créée et hydratée
 */
export async function createExpense(expenseData: CreateExpenseInput): Promise<Expense> {
  if (!expenseData.sortieId) {
    throw new Error('createExpense: sortieId est requis');
  }
  if (!expenseData.title?.trim()) {
    throw new Error('createExpense: title est requis');
  }
  if (expenseData.amountCents <= 0) {
    throw new Error('createExpense: amountCents doit être strictement positif');
  }
  if (!expenseData.payerId) {
    throw new Error('createExpense: payerId est requis');
  }

  // 1. Insertion de la dépense principale
  const insertPayload: TablesInsert<'expenses'> = {
    sortie_id: expenseData.sortieId,
    title: expenseData.title.trim(),
    amount_cents: expenseData.amountCents,
    payer_id: expenseData.payerId,
    split_type: expenseData.splitType,
    category: expenseData.category,
    date: expenseData.date || new Date().toISOString(),
    created_by: expenseData.createdBy,
  };

  const { data: expenseRow, error: expenseError } = await supabase
    .from('expenses')
    .insert(insertPayload)
    .select()
    .single();

  if (expenseError || !expenseRow) {
    throw new Error(`Échec de la création de la dépense : ${expenseError?.message || 'Erreur inconnue'}`);
  }

  const expenseId = expenseRow.id;

  try {
    // 2. Insertion des multi-payeurs si présents
    if (expenseData.payers && expenseData.payers.length > 0) {
      const payerInserts: TablesInsert<'expense_payers'>[] = expenseData.payers.map((p) => ({
        expense_id: expenseId,
        user_id: p.userId,
        amount_cents: p.amountCents,
      }));

      const { error: payersError } = await supabase.from('expense_payers').insert(payerInserts);

      if (payersError) {
        throw new Error(`Échec de l'enregistrement des payeurs : ${payersError.message}`);
      }
    }

    // 3. Insertion des répartitions bénéficiaires
    if (expenseData.splits && expenseData.splits.length > 0) {
      const splitInserts: TablesInsert<'expense_splits'>[] = expenseData.splits.map((s) => ({
        expense_id: expenseId,
        user_id: s.userId,
        amount_cents: s.amountCents,
        percentage: s.percentage !== undefined ? s.percentage : null,
        shares: s.shares !== undefined ? s.shares : null,
      }));

      const { error: splitsError } = await supabase.from('expense_splits').insert(splitInserts);

      if (splitsError) {
        throw new Error(`Échec de l'enregistrement des répartitions : ${splitsError.message}`);
      }
    }
  } catch (err: unknown) {
    // Rollback / Nettoyage de la dépense créée en cas d'échec sur les sous-tables
    await supabase.from('expenses').delete().eq('id', expenseId);
    throw err;
  }

  return {
    id: expenseRow.id,
    sortieId: expenseRow.sortie_id,
    title: expenseRow.title,
    amountCents: expenseRow.amount_cents,
    payerId: expenseRow.payer_id,
    ...(expenseData.payers && expenseData.payers.length > 0 ? { payers: expenseData.payers } : {}),
    splitType: expenseRow.split_type as SplitType,
    category: expenseRow.category as ExpenseCategory,
    date: expenseRow.date,
    createdBy: expenseRow.created_by,
    createdAt: expenseRow.created_at,
    splits: expenseData.splits || [],
  };
}

/**
 * Met à jour une dépense existante ainsi que ses payeurs et répartitions si fournis.
 *
 * @param id - Identifiant de la dépense
 * @param updates - Champs modifiés
 * @returns Dépense mise à jour
 */
export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  if (!id) {
    throw new Error('updateExpense: id est requis');
  }

  const expenseUpdates: TablesUpdate<'expenses'> = {};
  if (updates.title !== undefined) expenseUpdates.title = updates.title.trim();
  if (updates.amountCents !== undefined) expenseUpdates.amount_cents = updates.amountCents;
  if (updates.payerId !== undefined) expenseUpdates.payer_id = updates.payerId;
  if (updates.splitType !== undefined) expenseUpdates.split_type = updates.splitType;
  if (updates.category !== undefined) expenseUpdates.category = updates.category;
  if (updates.date !== undefined) expenseUpdates.date = updates.date;
  if (updates.sortieId !== undefined) expenseUpdates.sortie_id = updates.sortieId;
  if (updates.createdBy !== undefined) expenseUpdates.created_by = updates.createdBy;

  if (Object.keys(expenseUpdates).length > 0) {
    const { error: updateError } = await supabase
      .from('expenses')
      .update(expenseUpdates)
      .eq('id', id);

    if (updateError) {
      throw new Error(`Échec de la mise à jour de la dépense ${id} : ${updateError.message}`);
    }
  }

  if (updates.payers !== undefined) {
    const { error: deletePayersError } = await supabase
      .from('expense_payers')
      .delete()
      .eq('expense_id', id);

    if (deletePayersError) {
      throw new Error(
        `Échec de la purge des payeurs précédents pour ${id} : ${deletePayersError.message}`
      );
    }

    if (updates.payers.length > 0) {
      const payerInserts: TablesInsert<'expense_payers'>[] = updates.payers.map((p) => ({
        expense_id: id,
        user_id: p.userId,
        amount_cents: p.amountCents,
      }));

      const { error: insertPayersError } = await supabase
        .from('expense_payers')
        .insert(payerInserts);

      if (insertPayersError) {
        throw new Error(
          `Échec de la mise à jour des payeurs pour ${id} : ${insertPayersError.message}`
        );
      }
    }
  }

  if (updates.splits !== undefined) {
    const { error: deleteSplitsError } = await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', id);

    if (deleteSplitsError) {
      throw new Error(
        `Échec de la purge des répartitions précédentes pour ${id} : ${deleteSplitsError.message}`
      );
    }

    if (updates.splits.length > 0) {
      const splitInserts: TablesInsert<'expense_splits'>[] = updates.splits.map((s) => ({
        expense_id: id,
        user_id: s.userId,
        amount_cents: s.amountCents,
        percentage: s.percentage !== undefined ? s.percentage : null,
        shares: s.shares !== undefined ? s.shares : null,
      }));

      const { error: insertSplitsError } = await supabase
        .from('expense_splits')
        .insert(splitInserts);

      if (insertSplitsError) {
        throw new Error(
          `Échec de la mise à jour des répartitions pour ${id} : ${insertSplitsError.message}`
        );
      }
    }
  }

  return fetchExpenseById(id);
}

/**
 * Supprime une dépense par son identifiant (cascade automatiquement vers payers et splits en BDD).
 *
 * @param id - Identifiant de la dépense
 */
export async function deleteExpense(id: string): Promise<void> {
  if (!id) {
    throw new Error('deleteExpense: id est requis');
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id);

  if (error) {
    throw new Error(`Échec de la suppression de la dépense ${id} : ${error.message}`);
  }
}

/**
 * Crée un enregistrement de remboursement direct / règlement de dette.
 *
 * @param settlementData - Données du remboursement (sans id ni createdAt)
 * @returns Remboursement créé et hydraté
 */
export async function createSettlement(
  settlementData: CreateSettlementInput
): Promise<Settlement> {
  if (!settlementData.sortieId) {
    throw new Error('createSettlement: sortieId est requis');
  }
  if (!settlementData.payerId) {
    throw new Error('createSettlement: payerId est requis');
  }
  if (!settlementData.recipientId) {
    throw new Error('createSettlement: recipientId est requis');
  }
  if (settlementData.payerId === settlementData.recipientId) {
    throw new Error('createSettlement: le payeur et le bénéficiaire ne peuvent pas être identiques');
  }
  if (settlementData.amountCents <= 0) {
    throw new Error('createSettlement: amountCents doit être strictement positif');
  }

  const insertPayload: TablesInsert<'settlements'> = {
    sortie_id: settlementData.sortieId,
    payer_id: settlementData.payerId,
    recipient_id: settlementData.recipientId,
    amount_cents: settlementData.amountCents,
    date: settlementData.date || new Date().toISOString(),
    notes: settlementData.notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('settlements')
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Échec de la création du remboursement : ${error?.message || 'Erreur inconnue'}`
    );
  }

  return mapSettlementRowToDomain(data);
}

/**
 * Supprime un remboursement par son identifiant.
 *
 * @param id - Identifiant du règlement
 */
export async function deleteSettlement(id: string): Promise<void> {
  if (!id) {
    throw new Error('deleteSettlement: id est requis');
  }

  const { error } = await supabase.from('settlements').delete().eq('id', id);

  if (error) {
    throw new Error(`Échec de la suppression du remboursement ${id} : ${error.message}`);
  }
}

/**
 * Objet d'export principal pour le service finances
 */
export const financesService = {
  fetchExpenses,
  fetchExpenseById,
  fetchSettlements,
  createExpense,
  updateExpense,
  deleteExpense,
  createSettlement,
  deleteSettlement,
};
