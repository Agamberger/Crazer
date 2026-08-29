import * as fs from 'fs';
import * as path from 'path';
import type { Database } from '../../../shared/types/database.types';
import type {
  Expense,
  ExpensePayer,
  ExpenseSplit,
  Settlement,
  SplitType,
  ExpenseCategory,
} from '../types';

describe('Milestone 1 — SQL Migration, RLS & Database Types Stress Test', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../../supabase/migrations/20260817220000_create_finances_tables.sql'
  );
  let migrationSql: string;

  beforeAll(() => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    migrationSql = fs.readFileSync(migrationPath, 'utf8');
  });

  describe('1. SQL DDL & Table Structure Stress Testing', () => {
    it('defines all 4 core tables with proper UUID primary keys', () => {
      expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.expenses\s*\(/);
      expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.expense_payers\s*\(/);
      expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.expense_splits\s*\(/);
      expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.settlements\s*\(/);

      // Primary keys
      expect(migrationSql).toMatch(/id UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    });

    it('enforces amount_cents > 0 check on expenses', () => {
      const expensesMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.expenses\s*\([\s\S]*?\);/);
      expect(expensesMatch).not.toBeNull();
      expect(expensesMatch![0]).toMatch(/amount_cents INTEGER NOT NULL CHECK \(amount_cents > 0\)/);
    });

    it('enforces amount_cents > 0 check on expense_payers', () => {
      const payersMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.expense_payers\s*\([\s\S]*?\);/);
      expect(payersMatch).not.toBeNull();
      expect(payersMatch![0]).toMatch(/amount_cents INTEGER NOT NULL CHECK \(amount_cents > 0\)/);
    });

    it('enforces amount_cents >= 0 check on expense_splits (allowing zero-amount splits)', () => {
      const splitsMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.expense_splits\s*\([\s\S]*?\);/);
      expect(splitsMatch).not.toBeNull();
      expect(splitsMatch![0]).toMatch(/amount_cents INTEGER NOT NULL CHECK \(amount_cents >= 0\)/);
    });

    it('enforces amount_cents > 0 and distinct payer/recipient on settlements', () => {
      const settlementsMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.settlements\s*\([\s\S]*?\);/);
      expect(settlementsMatch).not.toBeNull();
      expect(settlementsMatch![0]).toMatch(/amount_cents INTEGER NOT NULL CHECK \(amount_cents > 0\)/);
      expect(settlementsMatch![0]).toMatch(
        /CONSTRAINT check_settlement_distinct_users CHECK \(payer_id <> recipient_id\)/
      );
    });

    it('enforces allowed split_type enum values in expenses', () => {
      const expensesMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.expenses\s*\([\s\S]*?\);/);
      expect(expensesMatch![0]).toMatch(
        /split_type TEXT NOT NULL CHECK \(split_type IN \('equal', 'exact', 'percentage', 'shares'\)\)/
      );
    });

    it('enforces allowed category enum values in expenses', () => {
      const expensesMatch = migrationSql.match(/CREATE TABLE IF NOT EXISTS public\.expenses\s*\([\s\S]*?\);/);
      expect(expensesMatch![0]).toMatch(
        /category TEXT NOT NULL CHECK \(category IN \('restaurant', 'bar', 'transport', 'logement', 'activite', 'courses', 'autre'\)\)/
      );
    });

    it('enforces unique constraints on (expense_id, user_id) in payers and splits', () => {
      expect(migrationSql).toMatch(/CONSTRAINT unique_expense_payer UNIQUE \(expense_id, user_id\)/);
      expect(migrationSql).toMatch(/CONSTRAINT unique_expense_split UNIQUE \(expense_id, user_id\)/);
    });
  });

  describe('2. Foreign Keys & Cascade Delete Rules', () => {
    it('verifies ON DELETE CASCADE on child tables (expense_payers, expense_splits, settlements)', () => {
      // expense_payers
      expect(migrationSql).toMatch(
        /expense_id UUID NOT NULL REFERENCES public\.expenses\(id\) ON DELETE CASCADE/
      );
      expect(migrationSql).toMatch(
        /user_id UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/
      );

      // expense_splits
      expect(migrationSql).toMatch(
        /expense_id UUID NOT NULL REFERENCES public\.expenses\(id\) ON DELETE CASCADE/
      );

      // settlements
      expect(migrationSql).toMatch(
        /payer_id UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/
      );
      expect(migrationSql).toMatch(
        /recipient_id UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/
      );
    });

    it('verifies foreign key constraints on public.expenses', () => {
      expect(migrationSql).toMatch(
        /created_by UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/
      );
      expect(migrationSql).toMatch(
        /payer_id UUID NOT NULL REFERENCES public\.profiles\(id\) ON DELETE RESTRICT/
      );
    });
  });

  describe('3. Performance Indexing', () => {
    it('includes all necessary lookup indexes for query optimization', () => {
      const requiredIndexes = [
        'idx_expenses_sortie_id',
        'idx_expenses_payer_id',
        'idx_expenses_created_by',
        'idx_expenses_category',
        'idx_expenses_date',
        'idx_expense_payers_expense_id',
        'idx_expense_payers_user_id',
        'idx_expense_splits_expense_id',
        'idx_expense_splits_user_id',
        'idx_settlements_sortie_id',
        'idx_settlements_payer_id',
        'idx_settlements_recipient_id',
        'idx_settlements_date',
      ];

      for (const indexName of requiredIndexes) {
        expect(migrationSql).toContain(`CREATE INDEX IF NOT EXISTS ${indexName}`);
      }
    });
  });

  describe('4. Row Level Security (RLS) Policy Verification', () => {
    it('enables RLS on all 4 tables', () => {
      expect(migrationSql).toContain('ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;');
      expect(migrationSql).toContain('ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;');
      expect(migrationSql).toContain('ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;');
      expect(migrationSql).toContain('ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;');
    });

    it('simulates RLS permission checks for expenses (creator/payer authorization)', () => {
      const expensePolicyEvaluator = {
        canInsert: (authUid: string, row: { created_by: string; payer_id: string }) =>
          authUid === row.created_by || authUid === row.payer_id,
        canUpdate: (authUid: string, row: { created_by: string; payer_id: string }) =>
          authUid === row.created_by || authUid === row.payer_id,
        canDelete: (authUid: string, row: { created_by: string; payer_id: string }) =>
          authUid === row.created_by || authUid === row.payer_id,
      };

      const userA = 'user-uuid-aaa';
      const userB = 'user-uuid-bbb';
      const userAttacker = 'user-uuid-attacker';

      const expenseCreatedByA = { created_by: userA, payer_id: userB };

      // User A (creator) can insert/update/delete
      expect(expensePolicyEvaluator.canInsert(userA, expenseCreatedByA)).toBe(true);
      expect(expensePolicyEvaluator.canUpdate(userA, expenseCreatedByA)).toBe(true);
      expect(expensePolicyEvaluator.canDelete(userA, expenseCreatedByA)).toBe(true);

      // User B (payer) can insert/update/delete
      expect(expensePolicyEvaluator.canInsert(userB, expenseCreatedByA)).toBe(true);
      expect(expensePolicyEvaluator.canUpdate(userB, expenseCreatedByA)).toBe(true);
      expect(expensePolicyEvaluator.canDelete(userB, expenseCreatedByA)).toBe(true);

      // Attacker cannot mutate
      expect(expensePolicyEvaluator.canInsert(userAttacker, expenseCreatedByA)).toBe(false);
      expect(expensePolicyEvaluator.canUpdate(userAttacker, expenseCreatedByA)).toBe(false);
      expect(expensePolicyEvaluator.canDelete(userAttacker, expenseCreatedByA)).toBe(false);
    });

    it('simulates RLS permission checks for settlements', () => {
      const settlementPolicyEvaluator = {
        canInsert: (authUid: string, row: { payer_id: string; recipient_id: string }) =>
          authUid === row.payer_id,
        canUpdate: (authUid: string, row: { payer_id: string; recipient_id: string }) =>
          authUid === row.payer_id || authUid === row.recipient_id,
        canDelete: (authUid: string, row: { payer_id: string; recipient_id: string }) =>
          authUid === row.payer_id,
      };

      const payer = 'user-uuid-payer';
      const recipient = 'user-uuid-recipient';
      const thirdParty = 'user-uuid-thirdparty';

      const settlement = { payer_id: payer, recipient_id: recipient };

      // Payer can insert, update, delete
      expect(settlementPolicyEvaluator.canInsert(payer, settlement)).toBe(true);
      expect(settlementPolicyEvaluator.canUpdate(payer, settlement)).toBe(true);
      expect(settlementPolicyEvaluator.canDelete(payer, settlement)).toBe(true);

      // Recipient cannot insert on behalf of payer, but can update status/notes, cannot delete
      expect(settlementPolicyEvaluator.canInsert(recipient, settlement)).toBe(false);
      expect(settlementPolicyEvaluator.canUpdate(recipient, settlement)).toBe(true);
      expect(settlementPolicyEvaluator.canDelete(recipient, settlement)).toBe(false);

      // Third party cannot do anything
      expect(settlementPolicyEvaluator.canInsert(thirdParty, settlement)).toBe(false);
      expect(settlementPolicyEvaluator.canUpdate(thirdParty, settlement)).toBe(false);
      expect(settlementPolicyEvaluator.canDelete(thirdParty, settlement)).toBe(false);
    });
  });

  describe('5. TypeScript Database Types Conformance', () => {
    it('ensures Database schema types match SQL column nullability and types', () => {
      type ExpensesRow = Database['public']['Tables']['expenses']['Row'];
      type ExpensePayersRow = Database['public']['Tables']['expense_payers']['Row'];
      type ExpenseSplitsRow = Database['public']['Tables']['expense_splits']['Row'];
      type SettlementsRow = Database['public']['Tables']['settlements']['Row'];

      const mockExpenseRow: ExpensesRow = {
        id: 'exp-1',
        sortie_id: 'sortie-1',
        title: 'Dinner',
        amount_cents: 4500,
        payer_id: 'usr-1',
        split_type: 'equal',
        category: 'restaurant',
        date: '2026-08-17T20:00:00Z',
        created_by: 'usr-1',
        created_at: '2026-08-17T20:00:00Z',
        updated_at: '2026-08-17T20:00:00Z',
      };
      expect(mockExpenseRow.amount_cents).toBe(4500);

      const mockPayerRow: ExpensePayersRow = {
        id: 'payer-1',
        expense_id: 'exp-1',
        user_id: 'usr-1',
        amount_cents: 4500,
        created_at: '2026-08-17T20:00:00Z',
      };
      expect(mockPayerRow.amount_cents).toBe(4500);

      const mockSplitRow: ExpenseSplitsRow = {
        id: 'split-1',
        expense_id: 'exp-1',
        user_id: 'usr-2',
        amount_cents: 2250,
        percentage: 50.0,
        shares: null,
        created_at: '2026-08-17T20:00:00Z',
      };
      expect(mockSplitRow.percentage).toBe(50.0);
      expect(mockSplitRow.shares).toBeNull();

      const mockSettlementRow: SettlementsRow = {
        id: 'set-1',
        sortie_id: 'sortie-1',
        payer_id: 'usr-2',
        recipient_id: 'usr-1',
        amount_cents: 2250,
        date: '2026-08-17T21:00:00Z',
        notes: 'Remboursement resto',
        created_at: '2026-08-17T21:00:00Z',
        updated_at: '2026-08-17T21:00:00Z',
      };
      expect(mockSettlementRow.notes).toBe('Remboursement resto');
    });

    it('ensures Insert types allow optional defaults (id, created_at, updated_at, date)', () => {
      type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
      type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];

      const validInsert: ExpenseInsert = {
        sortie_id: 'sortie-1',
        title: 'Bar',
        amount_cents: 3000,
        payer_id: 'usr-1',
        created_by: 'usr-1',
        category: 'bar',
      };
      expect(validInsert.title).toBe('Bar');

      const validSettlementInsert: SettlementInsert = {
        sortie_id: 'sortie-1',
        payer_id: 'usr-2',
        recipient_id: 'usr-1',
        amount_cents: 1500,
      };
      expect(validSettlementInsert.amount_cents).toBe(1500);
    });
  });

  describe('6. Domain Types Interface Alignment', () => {
    it('verifies mapping fidelity between Domain Models and DB schemas', () => {
      const splitType: SplitType = 'shares';
      const category: ExpenseCategory = 'activite';
      const payers: ExpensePayer[] = [
        { userId: 'u-1', amountCents: 6000 },
        { userId: 'u-2', amountCents: 6000 },
      ];
      const splits: ExpenseSplit[] = [
        { userId: 'u-1', amountCents: 4000, shares: 1 },
        { userId: 'u-2', amountCents: 8000, shares: 2 },
      ];

      const domainExpense: Expense = {
        id: 'exp-123',
        sortieId: 's-1',
        title: 'Activités Nautiques',
        amountCents: 12000,
        payerId: 'u-1',
        payers,
        splitType,
        category,
        date: '2026-08-17T14:00:00Z',
        createdBy: 'u-1',
        createdAt: '2026-08-17T14:00:00Z',
        splits,
      };

      const domainSettlement: Settlement = {
        id: 'settle-1',
        sortieId: 's-1',
        payerId: 'u-2',
        recipientId: 'u-1',
        amountCents: 2000,
        date: '2026-08-17T16:00:00Z',
        createdAt: '2026-08-17T16:00:00Z',
        notes: 'Part kayak',
      };

      expect(domainExpense.splits).toHaveLength(2);
      expect(domainExpense.splitType).toBe('shares');
      expect(domainSettlement.amountCents).toBe(2000);
    });
  });
});
