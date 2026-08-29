/**
 * E2E Acceptance Test Suite — Tier 2: Boundary & Corner Cases
 * 
 * Focus Areas:
 * - Sub-centime / 1-centime splits & remainders
 * - Large numbers & high-value transactions (€1M+)
 * - 100% / 0% split allocations & non-beneficiary payers
 * - Perfectly balanced debts (0 net balance)
 * - Circular debt resolution (3-way, 4-way, asymmetric cycles)
 * - Floating-point precision defense (1/3, 1/7, prime denominators)
 * 
 * Requirements: ORIGINAL_REQUEST §R2, PROJECT.md §Interface Contracts
 */

import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
} from '../../utils/financialMath';
import { Expense } from '../../types';

function getSplitValue(split: Record<string, number> | Map<string, number>, key: string): number {
  if (split instanceof Map) {
    return split.get(key) || 0;
  }
  return (split as Record<string, number>)[key] || 0;
}

function sumSplitValues(split: Record<string, number> | Map<string, number>): number {
  if (split instanceof Map) {
    let sum = 0;
    split.forEach((val) => { sum += val; });
    return sum;
  }
  return Object.values(split).reduce((acc, val) => acc + val, 0);
}

describe('Tier 2: Boundary & Corner Cases', () => {

  // =========================================================================
  // 1. Sub-centime / 1-Centime Splits
  // =========================================================================
  describe('Sub-centime & Minimal Splits', () => {
    test('splits 1 centime among 3 people without losing or creating money', () => {
      const beneficiaries = ['alice', 'bob', 'charlie'];
      const result = calculateEqualSplit(1, beneficiaries);
      expect(sumSplitValues(result)).toBe(1);
      // First person gets 1 cent, others get 0 cents
      expect(getSplitValue(result, 'alice')).toBe(1);
      expect(getSplitValue(result, 'bob')).toBe(0);
      expect(getSplitValue(result, 'charlie')).toBe(0);
    });

    test('splits 2 centimes among 3 people deterministically', () => {
      const beneficiaries = ['alice', 'bob', 'charlie'];
      const result = calculateEqualSplit(2, beneficiaries);
      expect(sumSplitValues(result)).toBe(2);
      expect(getSplitValue(result, 'alice')).toBe(1);
      expect(getSplitValue(result, 'bob')).toBe(1);
      expect(getSplitValue(result, 'charlie')).toBe(0);
    });

    test('splits 1 centime across 10 participants', () => {
      const participants = Array.from({ length: 10 }, (_, i) => `user_${i}`);
      const result = calculateEqualSplit(1, participants);
      expect(sumSplitValues(result)).toBe(1);
      expect(getSplitValue(result, 'user_0')).toBe(1);
      for (let i = 1; i < 10; i++) {
        expect(getSplitValue(result, `user_${i}`)).toBe(0);
      }
    });

    test('splits 5 centimes among 7 participants (5 get 1 cent, 2 get 0 cents)', () => {
      const participants = Array.from({ length: 7 }, (_, i) => `user_${i}`);
      const result = calculateEqualSplit(5, participants);
      expect(sumSplitValues(result)).toBe(5);
      for (let i = 0; i < 5; i++) {
        expect(getSplitValue(result, `user_${i}`)).toBe(1);
      }
      expect(getSplitValue(result, 'user_5')).toBe(0);
      expect(getSplitValue(result, 'user_6')).toBe(0);
    });
  });

  // =========================================================================
  // 2. High-Value / Large Numbers Transactions
  // =========================================================================
  describe('Large Numbers & Extreme Values', () => {
    test('handles €1,000,000.00 (100,000,000 cents) split equally among 7 people', () => {
      const participants = Array.from({ length: 7 }, (_, i) => `member_${i}`);
      const total = 100_000_000;
      const result = calculateEqualSplit(total, participants);
      expect(sumSplitValues(result)).toBe(total);
      // 100,000,000 / 7 = 14,285,714 with remainder 2
      expect(getSplitValue(result, 'member_0')).toBe(14_285_715);
      expect(getSplitValue(result, 'member_1')).toBe(14_285_715);
      expect(getSplitValue(result, 'member_2')).toBe(14_285_714);
      expect(getSplitValue(result, 'member_6')).toBe(14_285_714);
    });

    test('handles €9,999,999.99 (999,999,999 cents) with 33.33%, 33.33%, 33.34% percentage splits', () => {
      const total = 999_999_999;
      const percentages = [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ];
      const result = calculatePercentageSplit(total, percentages);
      expect(sumSplitValues(result)).toBe(total);
    });

    test('handles large multi-payer settlement with 10 payers funding €500,000.00', () => {
      const total = 50_000_000; // 500,000.00 €
      const payers = Array.from({ length: 10 }, (_, i) => ({
        userId: `payer_${i}`,
        amountCents: 5_000_000, // 50,000.00 € each
      }));
      const beneficiaries = Array.from({ length: 10 }, (_, i) => `payer_${i}`);

      const expense: Expense = {
        id: 'large_exp',
        sortieId: 's_large',
        title: 'Real estate booking',
        amountCents: total,
        payerId: 'payer_0',
        payers,
        splitType: 'equal',
        category: 'logement',
        date: '2026-08-17',
        createdBy: 'payer_0',
        createdAt: '2026-08-17T08:00:00Z',
        splits: beneficiaries.map(id => ({ userId: id, amountCents: 5_000_000 })),
      };

      const balances = calculateNetBalances([expense], [], beneficiaries);
      // Everyone paid 50,000€ and owed 50,000€ => everyone has net 0
      beneficiaries.forEach(id => {
        expect(balances[id].netBalanceCents).toBe(0);
      });
      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. 100% / 0% Split Boundary Allocations
  // =========================================================================
  describe('100% and 0% Boundary Allocations', () => {
    test('100% split to 1 person in a multi-user group', () => {
      const percentages = [
        { userId: 'alice', percentage: 100 },
        { userId: 'bob', percentage: 0 },
        { userId: 'charlie', percentage: 0 },
      ];
      const result = calculatePercentageSplit(8500, percentages);
      expect(getSplitValue(result, 'alice')).toBe(8500);
      expect(getSplitValue(result, 'bob')).toBe(0);
      expect(getSplitValue(result, 'charlie')).toBe(0);
      expect(sumSplitValues(result)).toBe(8500);
    });

    test('shares split with 0 shares for one participant', () => {
      const shares = [
        { userId: 'alice', shares: 3 },
        { userId: 'bob', shares: 0 },
        { userId: 'charlie', shares: 1 },
      ];
      const result = calculateSharesSplit(4000, shares);
      expect(getSplitValue(result, 'alice')).toBe(3000);
      expect(getSplitValue(result, 'bob')).toBe(0);
      expect(getSplitValue(result, 'charlie')).toBe(1000);
      expect(sumSplitValues(result)).toBe(4000);
    });

    test('expense where payer is sole beneficiary has 0 net effect on group', () => {
      const expense: Expense = {
        id: 'solo_exp',
        sortieId: 's1',
        title: 'Personal souvenir',
        amountCents: 3500,
        payerId: 'alice',
        splitType: 'equal',
        category: 'autre',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T12:00:00Z',
        splits: [{ userId: 'alice', amountCents: 3500 }],
      };

      const balances = calculateNetBalances([expense], [], ['alice', 'bob']);
      expect(balances['alice'].totalPaidCents).toBe(3500);
      expect(balances['alice'].totalOwedCents).toBe(3500);
      expect(balances['alice'].netBalanceCents).toBe(0);
      expect(balances['bob'].netBalanceCents).toBe(0);
    });

    test('expense where payer is not in the beneficiaries list (external sponsor)', () => {
      const expense: Expense = {
        id: 'gift_exp',
        sortieId: 's1',
        title: 'Gift from external friend',
        amountCents: 9000,
        payerId: 'sponsor',
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'sponsor',
        createdAt: '2026-08-17T14:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 4500 },
          { userId: 'bob', amountCents: 4500 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['sponsor', 'alice', 'bob']);
      expect(balances['sponsor'].netBalanceCents).toBe(9000);
      expect(balances['alice'].netBalanceCents).toBe(-4500);
      expect(balances['bob'].netBalanceCents).toBe(-4500);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(2);
      expect(transfers.every(t => t.toUserId === 'sponsor')).toBe(true);
    });
  });

  // =========================================================================
  // 4. Zero Balances & Perfectly Balanced Expenses
  // =========================================================================
  describe('Zero-Balance & Symmetrical Cancellation', () => {
    test('symmetrical two-way expenses cancel each other out completely', () => {
      const expenses: Expense[] = [
        {
          id: 'exp_1',
          sortieId: 's1',
          title: 'Alice pays for Bob',
          amountCents: 3000,
          payerId: 'alice',
          splitType: 'exact',
          category: 'restaurant',
          date: '2026-08-17',
          createdBy: 'alice',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'bob', amountCents: 3000 }],
        },
        {
          id: 'exp_2',
          sortieId: 's1',
          title: 'Bob pays for Alice',
          amountCents: 3000,
          payerId: 'bob',
          splitType: 'exact',
          category: 'bar',
          date: '2026-08-17',
          createdBy: 'bob',
          createdAt: '2026-08-17T12:00:00Z',
          splits: [{ userId: 'alice', amountCents: 3000 }],
        },
      ];

      const balances = calculateNetBalances(expenses, [], ['alice', 'bob']);
      expect(balances['alice'].netBalanceCents).toBe(0);
      expect(balances['bob'].netBalanceCents).toBe(0);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('3-way symmetrical equal cycle cancels out to 0 transfers', () => {
      // Alice pays 30€ for Bob
      // Bob pays 30€ for Charlie
      // Charlie pays 30€ for Alice
      const expenses: Expense[] = [
        {
          id: 'e1',
          sortieId: 's1',
          title: 'A for B',
          amountCents: 3000,
          payerId: 'alice',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'alice',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'bob', amountCents: 3000 }],
        },
        {
          id: 'e2',
          sortieId: 's1',
          title: 'B for C',
          amountCents: 3000,
          payerId: 'bob',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'bob',
          createdAt: '2026-08-17T11:00:00Z',
          splits: [{ userId: 'charlie', amountCents: 3000 }],
        },
        {
          id: 'e3',
          sortieId: 's1',
          title: 'C for A',
          amountCents: 3000,
          payerId: 'charlie',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'charlie',
          createdAt: '2026-08-17T12:00:00Z',
          splits: [{ userId: 'alice', amountCents: 3000 }],
        },
      ];

      const balances = calculateNetBalances(expenses, [], ['alice', 'bob', 'charlie']);
      expect(balances['alice'].netBalanceCents).toBe(0);
      expect(balances['bob'].netBalanceCents).toBe(0);
      expect(balances['charlie'].netBalanceCents).toBe(0);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });
  });

  // =========================================================================
  // 5. Circular Debts & Minimal Cash Flow Simplification
  // =========================================================================
  describe('Circular Debts & Minimization', () => {
    test('asymmetric 3-way cycle resolves into minimal transfers', () => {
      // Alice pays 50€ for Bob
      // Bob pays 40€ for Charlie
      // Charlie pays 30€ for Alice
      // Net: Alice: +20€, Bob: -10€, Charlie: -10€
      const expenses: Expense[] = [
        {
          id: 'e1',
          sortieId: 's1',
          title: 'A for B',
          amountCents: 5000,
          payerId: 'alice',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'alice',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'bob', amountCents: 5000 }],
        },
        {
          id: 'e2',
          sortieId: 's1',
          title: 'B for C',
          amountCents: 4000,
          payerId: 'bob',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'bob',
          createdAt: '2026-08-17T11:00:00Z',
          splits: [{ userId: 'charlie', amountCents: 4000 }],
        },
        {
          id: 'e3',
          sortieId: 's1',
          title: 'C for A',
          amountCents: 3000,
          payerId: 'charlie',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'charlie',
          createdAt: '2026-08-17T12:00:00Z',
          splits: [{ userId: 'alice', amountCents: 3000 }],
        },
      ];

      const balances = calculateNetBalances(expenses, [], ['alice', 'bob', 'charlie']);
      expect(balances['alice'].netBalanceCents).toBe(2000);
      expect(balances['bob'].netBalanceCents).toBe(-1000);
      expect(balances['charlie'].netBalanceCents).toBe(-1000);

      const transfers = simplifyDebts(balances);
      // Instead of 3 cyclic payments (50+40+30=120€ transferred), simplified into 2 transfers (10+10=20€)
      expect(transfers).toHaveLength(2);
      expect(transfers.every(t => t.toUserId === 'alice')).toBe(true);
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBe(2000);
    });

    test('4-way asymmetric cycle resolves cleanly (A->B, B->C, C->D, D->A)', () => {
      // Alice pays 100€ for Bob
      // Bob pays 80€ for Charlie
      // Charlie pays 60€ for David
      // David pays 40€ for Alice
      // Net balances:
      // Alice: paid 100 - owed 40 = +60€
      // Bob: paid 80 - owed 100 = -20€
      // Charlie: paid 60 - owed 80 = -20€
      // David: paid 40 - owed 60 = -20€
      const expenses: Expense[] = [
        { id: 'e1', sortieId: 's1', title: 'A->B', amountCents: 10000, payerId: 'alice', splitType: 'exact', category: 'autre', date: '2026-08-17', createdBy: 'a', createdAt: '2026-08-17T01:00:00Z', splits: [{ userId: 'bob', amountCents: 10000 }] },
        { id: 'e2', sortieId: 's1', title: 'B->C', amountCents: 8000, payerId: 'bob', splitType: 'exact', category: 'autre', date: '2026-08-17', createdBy: 'b', createdAt: '2026-08-17T02:00:00Z', splits: [{ userId: 'charlie', amountCents: 8000 }] },
        { id: 'e3', sortieId: 's1', title: 'C->D', amountCents: 6000, payerId: 'charlie', splitType: 'exact', category: 'autre', date: '2026-08-17', createdBy: 'c', createdAt: '2026-08-17T03:00:00Z', splits: [{ userId: 'david', amountCents: 6000 }] },
        { id: 'e4', sortieId: 's1', title: 'D->A', amountCents: 4000, payerId: 'david', splitType: 'exact', category: 'autre', date: '2026-08-17', createdBy: 'd', createdAt: '2026-08-17T04:00:00Z', splits: [{ userId: 'alice', amountCents: 4000 }] },
      ];

      const balances = calculateNetBalances(expenses, [], ['alice', 'bob', 'charlie', 'david']);
      expect(balances['alice'].netBalanceCents).toBe(6000);
      expect(balances['bob'].netBalanceCents).toBe(-2000);
      expect(balances['charlie'].netBalanceCents).toBe(-2000);
      expect(balances['david'].netBalanceCents).toBe(-2000);

      const transfers = simplifyDebts(balances);
      // 3 transfers: Bob->Alice 20€, Charlie->Alice 20€, David->Alice 20€
      expect(transfers).toHaveLength(3);
      expect(transfers.every(t => t.toUserId === 'alice')).toBe(true);
      expect(transfers.reduce((s, t) => s + t.amountCents, 0)).toBe(6000);
    });
  });

  // =========================================================================
  // 6. Prime Denominators & Repeating Fractions
  // =========================================================================
  describe('Prime Denominators & Repeating Fractions', () => {
    test('splits evenly across prime denominators: 13, 17, 19', () => {
      const primes = [13, 17, 19];
      primes.forEach(p => {
        const users = Array.from({ length: p }, (_, i) => `user_${i}`);
        const totalCents = 10000; // €100.00
        const result = calculateEqualSplit(totalCents, users);
        expect(sumSplitValues(result)).toBe(totalCents);
      });
    });

    test('deterministic tie-breaking when multiple participants have identical fractional remainders', () => {
      // 10 cents / 4 people = 2.5 cents each => base 2, remainder 2 cents
      const users = ['user_1', 'user_2', 'user_3', 'user_4'];
      const result = calculateEqualSplit(10, users);
      expect(sumSplitValues(result)).toBe(10);
      // Stable order prioritizes user_1 and user_2
      expect(getSplitValue(result, 'user_1')).toBe(3);
      expect(getSplitValue(result, 'user_2')).toBe(3);
      expect(getSplitValue(result, 'user_3')).toBe(2);
      expect(getSplitValue(result, 'user_4')).toBe(2);
    });
  });
});
