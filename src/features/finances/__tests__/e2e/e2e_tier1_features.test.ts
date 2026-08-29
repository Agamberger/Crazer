/**
 * E2E Acceptance Test Suite — Tier 1: Core Feature Coverage
 * 
 * Features Covered:
 * - F-01: Centime-Exact Arithmetic
 * - F-02: Equal Split Mode (Hare-Niemeyer Deterministic Rounding)
 * - F-03: Exact Amounts Split Mode
 * - F-04: Percentage Split Mode (Hare-Niemeyer)
 * - F-05: Shares / Weights Split Mode (Hare-Niemeyer)
 * - F-06: Multi-Payer Expenses
 * - F-07: Net Balances Engine (Zero-Sum Invariant)
 * - F-08: Minimal Cash Flow Debt Simplification
 * - F-09: Settlements & Direct Reimbursements
 * 
 * Requirements: ORIGINAL_REQUEST §R2, PROJECT.md §Interface Contracts
 */

import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
  formatCentsToEuros,
  parseEurosToCents,
} from '../../utils/financialMath';
import { Expense, Settlement, UserNetBalance } from '../../types';

// Helper to normalize split map/record
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

describe('Tier 1: Core Feature Coverage', () => {

  // =========================================================================
  // Feature 1: Centime-Exact Formatting & Parsing
  // =========================================================================
  describe('F-01: Centime-Exact Arithmetic & Converters', () => {
    test('1.1: converts standard Euro amounts to cents without floating-point error', () => {
      expect(parseEurosToCents(10.50)).toBe(1050);
      expect(parseEurosToCents('10.50')).toBe(1050);
      expect(parseEurosToCents('10,50')).toBe(1050);
      expect(parseEurosToCents(0.01)).toBe(1);
      expect(parseEurosToCents(0.00)).toBe(0);
    });

    test('1.2: formats cents to formatted Euro string', () => {
      expect(formatCentsToEuros(1050)).toBe('10,50 €');
      expect(formatCentsToEuros(1)).toBe('0,01 €');
      expect(formatCentsToEuros(0)).toBe('0,00 €');
      expect(formatCentsToEuros(-2550)).toBe('-25,50 €');
    });

    test('1.3: handles tricky decimal parsing without drift (e.g. 19.99, 0.07, 1.10)', () => {
      expect(parseEurosToCents('19.99')).toBe(1999);
      expect(parseEurosToCents('0.07')).toBe(7);
      expect(parseEurosToCents('1.10')).toBe(110);
      expect(parseEurosToCents('12345.67')).toBe(1234567);
    });

    test('1.4: safely parses integer values or string representations', () => {
      expect(parseEurosToCents(100)).toBe(10000);
      expect(parseEurosToCents('100')).toBe(10000);
      expect(parseEurosToCents('  42.50 € ')).toBe(4250);
    });

    test('1.5: returns 0 for invalid or empty input strings', () => {
      expect(parseEurosToCents('')).toBe(0);
      expect(parseEurosToCents('abc')).toBe(0);
      expect(parseEurosToCents(NaN)).toBe(0);
    });
  });

  // =========================================================================
  // Feature 2: Equal Split Mode (Hare-Niemeyer Rounding)
  // =========================================================================
  describe('F-02: Equal Split Mode', () => {
    test('2.1: even division between 2 beneficiaries (€50.00)', () => {
      const result = calculateEqualSplit(5000, ['user_a', 'user_b']);
      expect(getSplitValue(result, 'user_a')).toBe(2500);
      expect(getSplitValue(result, 'user_b')).toBe(2500);
      expect(sumSplitValues(result)).toBe(5000);
    });

    test('2.2: uneven 3-way division distributes residual centime deterministically (€10.00 -> 334, 333, 333)', () => {
      const result = calculateEqualSplit(1000, ['user_a', 'user_b', 'user_c']);
      expect(getSplitValue(result, 'user_a')).toBe(334);
      expect(getSplitValue(result, 'user_b')).toBe(333);
      expect(getSplitValue(result, 'user_c')).toBe(333);
      expect(sumSplitValues(result)).toBe(1000);
    });

    test('2.3: uneven 6-way division (€100.00 -> 1667 x 4, 1666 x 2 = 10000 cents)', () => {
      const users = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'];
      const result = calculateEqualSplit(10000, users);
      expect(getSplitValue(result, 'u1')).toBe(1667);
      expect(getSplitValue(result, 'u2')).toBe(1667);
      expect(getSplitValue(result, 'u3')).toBe(1667);
      expect(getSplitValue(result, 'u4')).toBe(1667);
      expect(getSplitValue(result, 'u5')).toBe(1666);
      expect(getSplitValue(result, 'u6')).toBe(1666);
      expect(sumSplitValues(result)).toBe(10000);
    });

    test('2.4: single beneficiary receives 100% of expense amount', () => {
      const result = calculateEqualSplit(4590, ['user_solo']);
      expect(getSplitValue(result, 'user_solo')).toBe(4590);
      expect(sumSplitValues(result)).toBe(4590);
    });

    test('2.5: handles large group division (11 members on €123.45)', () => {
      const users = Array.from({ length: 11 }, (_, i) => `user_${i + 1}`);
      const result = calculateEqualSplit(12345, users);
      // 12345 / 11 = 1122 with remainder 3 => first 3 get 1123, remaining 8 get 1122
      expect(getSplitValue(result, 'user_1')).toBe(1123);
      expect(getSplitValue(result, 'user_2')).toBe(1123);
      expect(getSplitValue(result, 'user_3')).toBe(1123);
      expect(getSplitValue(result, 'user_4')).toBe(1122);
      expect(getSplitValue(result, 'user_11')).toBe(1122);
      expect(sumSplitValues(result)).toBe(12345);
    });

    test('2.6: handles 0 total cents cleanly', () => {
      const result = calculateEqualSplit(0, ['user_a', 'user_b']);
      expect(getSplitValue(result, 'user_a')).toBe(0);
      expect(getSplitValue(result, 'user_b')).toBe(0);
      expect(sumSplitValues(result)).toBe(0);
    });
  });

  // =========================================================================
  // Feature 3: Exact Amounts Split Mode
  // =========================================================================
  describe('F-03: Exact Amounts Split Mode', () => {
    test('3.1: verifies exact custom allocations summing to total', () => {
      const allocations = [
        { userId: 'alice', amountCents: 1500 },
        { userId: 'bob', amountCents: 2250 },
        { userId: 'charlie', amountCents: 1250 },
      ];
      const result = calculateExactSplit(5000, allocations);
      expect(getSplitValue(result, 'alice')).toBe(1500);
      expect(getSplitValue(result, 'bob')).toBe(2250);
      expect(getSplitValue(result, 'charlie')).toBe(1250);
      expect(sumSplitValues(result)).toBe(5000);
    });

    test('3.2: supports 5-person itemized bill with varying cents', () => {
      const allocations = [
        { userId: 'u1', amountCents: 4520 },
        { userId: 'u2', amountCents: 1205 },
        { userId: 'u3', amountCents: 3310 },
        { userId: 'u4', amountCents: 5000 },
        { userId: 'u5', amountCents: 4700 },
      ];
      const total = 18735;
      const result = calculateExactSplit(total, allocations);
      expect(sumSplitValues(result)).toBe(total);
      expect(getSplitValue(result, 'u1')).toBe(4520);
      expect(getSplitValue(result, 'u4')).toBe(5000);
    });

    test('3.3: allows single user taking entire amount in exact mode', () => {
      const allocations = [{ userId: 'alice', amountCents: 7500 }];
      const result = calculateExactSplit(7500, allocations);
      expect(getSplitValue(result, 'alice')).toBe(7500);
      expect(sumSplitValues(result)).toBe(7500);
    });

    test('3.4: allows one user with 0 cents in exact allocations', () => {
      const allocations = [
        { userId: 'alice', amountCents: 3000 },
        { userId: 'bob', amountCents: 0 },
        { userId: 'charlie', amountCents: 2000 },
      ];
      const result = calculateExactSplit(5000, allocations);
      expect(getSplitValue(result, 'bob')).toBe(0);
      expect(sumSplitValues(result)).toBe(5000);
    });

    test('3.5: throws or flags mismatch when exact sum does not match total', () => {
      const allocations = [
        { userId: 'alice', amountCents: 1000 },
        { userId: 'bob', amountCents: 2000 },
      ];
      // total is 4000 but sum is 3000
      expect(() => {
        calculateExactSplit(4000, allocations);
      }).toThrow();
    });
  });

  // =========================================================================
  // Feature 4: Percentage Split Mode (Hare-Niemeyer)
  // =========================================================================
  describe('F-04: Percentage Split Mode', () => {
    test('4.1: standard 50% - 50% division on €75.00', () => {
      const percentages = [
        { userId: 'alice', percentage: 50 },
        { userId: 'bob', percentage: 50 },
      ];
      const result = calculatePercentageSplit(7500, percentages);
      expect(getSplitValue(result, 'alice')).toBe(3750);
      expect(getSplitValue(result, 'bob')).toBe(3750);
      expect(sumSplitValues(result)).toBe(7500);
    });

    test('4.2: 33.33% - 33.33% - 33.34% split on €100.00 preserves exact sum', () => {
      const percentages = [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ];
      const result = calculatePercentageSplit(10000, percentages);
      expect(getSplitValue(result, 'u1')).toBe(3333);
      expect(getSplitValue(result, 'u2')).toBe(3333);
      expect(getSplitValue(result, 'u3')).toBe(3334);
      expect(sumSplitValues(result)).toBe(10000);
    });

    test('4.3: 40% - 30% - 20% - 10% on €65.43 with Hare-Niemeyer remainder ranking', () => {
      const percentages = [
        { userId: 'u1', percentage: 40 }, // 2617.2 -> 2617 (rem .2)
        { userId: 'u2', percentage: 30 }, // 1962.9 -> 1962 (rem .9) => +1 = 1963
        { userId: 'u3', percentage: 20 }, // 1308.6 -> 1308 (rem .6) => +1 = 1309
        { userId: 'u4', percentage: 10 }, //  654.3 ->  654 (rem .3)
      ];
      // base sum: 2617 + 1962 + 1308 + 654 = 6541. Missing 2 cents distributed to u2 (.9) and u3 (.6)
      const result = calculatePercentageSplit(6543, percentages);
      expect(getSplitValue(result, 'u1')).toBe(2617);
      expect(getSplitValue(result, 'u2')).toBe(1963);
      expect(getSplitValue(result, 'u3')).toBe(1309);
      expect(getSplitValue(result, 'u4')).toBe(654);
      expect(sumSplitValues(result)).toBe(6543);
    });

    test('4.4: asymmetric 70% - 15% - 15% on €250.00', () => {
      const percentages = [
        { userId: 'alice', percentage: 70 },
        { userId: 'bob', percentage: 15 },
        { userId: 'charlie', percentage: 15 },
      ];
      const result = calculatePercentageSplit(25000, percentages);
      expect(getSplitValue(result, 'alice')).toBe(17500);
      expect(getSplitValue(result, 'bob')).toBe(3750);
      expect(getSplitValue(result, 'charlie')).toBe(3750);
      expect(sumSplitValues(result)).toBe(25000);
    });

    test('4.5: single user receives 100% via percentage mode', () => {
      const percentages = [{ userId: 'alice', percentage: 100 }];
      const result = calculatePercentageSplit(8999, percentages);
      expect(getSplitValue(result, 'alice')).toBe(8999);
      expect(sumSplitValues(result)).toBe(8999);
    });
  });

  // =========================================================================
  // Feature 5: Shares / Weights Split Mode (Hare-Niemeyer)
  // =========================================================================
  describe('F-05: Shares / Weights Split Mode', () => {
    test('5.1: 1:2 share ratio on €30.00 (€10.00 and €20.00)', () => {
      const shares = [
        { userId: 'alice', shares: 1 },
        { userId: 'bob', shares: 2 },
      ];
      const result = calculateSharesSplit(3000, shares);
      expect(getSplitValue(result, 'alice')).toBe(1000);
      expect(getSplitValue(result, 'bob')).toBe(2000);
      expect(sumSplitValues(result)).toBe(3000);
    });

    test('5.2: 3:2:1 share ratio on €100.00 with fractional cents resolution', () => {
      // Total shares = 6. 10000 / 6 = 1666.666...
      // alice (3 shares): 5000.0 -> 5000
      // bob (2 shares): 3333.333... -> 3333 (rem .333)
      // charlie (1 share): 1666.666... -> 1666 (rem .666 => +1 = 1667)
      const shares = [
        { userId: 'alice', shares: 3 },
        { userId: 'bob', shares: 2 },
        { userId: 'charlie', shares: 1 },
      ];
      const result = calculateSharesSplit(10000, shares);
      expect(getSplitValue(result, 'alice')).toBe(5000);
      expect(getSplitValue(result, 'bob')).toBe(3333);
      expect(getSplitValue(result, 'charlie')).toBe(1667);
      expect(sumSplitValues(result)).toBe(10000);
    });

    test('5.3: equal shares (1:1:1:1) behave identically to equal split', () => {
      const shares = [
        { userId: 'u1', shares: 1 },
        { userId: 'u2', shares: 1 },
        { userId: 'u3', shares: 1 },
        { userId: 'u4', shares: 1 },
      ];
      const result = calculateSharesSplit(10000, shares);
      expect(getSplitValue(result, 'u1')).toBe(2500);
      expect(getSplitValue(result, 'u2')).toBe(2500);
      expect(getSplitValue(result, 'u3')).toBe(2500);
      expect(getSplitValue(result, 'u4')).toBe(2500);
      expect(sumSplitValues(result)).toBe(10000);
    });

    test('5.4: large weight disparity (10 shares vs 1 share on €55.55)', () => {
      // Total shares = 11. 5555 / 11 = 505 exactly.
      // u1 (10 shares): 5050
      // u2 (1 share): 505
      const shares = [
        { userId: 'u1', shares: 10 },
        { userId: 'u2', shares: 1 },
      ];
      const result = calculateSharesSplit(5555, shares);
      expect(getSplitValue(result, 'u1')).toBe(5050);
      expect(getSplitValue(result, 'u2')).toBe(505);
      expect(sumSplitValues(result)).toBe(5555);
    });

    test('5.5: 4-way shares with uneven remainders (3:3:2:1 on €77.77)', () => {
      // Total shares = 9. 7777 / 9 = 864.111...
      // u1 (3): 2592.333 -> 2592
      // u2 (3): 2592.333 -> 2592
      // u3 (2): 1728.222 -> 1728
      // u4 (1): 864.111 -> 864
      // Base sum = 7776. Remainder 1 cent goes to u1 (tie-breaker stable order).
      const shares = [
        { userId: 'u1', shares: 3 },
        { userId: 'u2', shares: 3 },
        { userId: 'u3', shares: 2 },
        { userId: 'u4', shares: 1 },
      ];
      const result = calculateSharesSplit(7777, shares);
      expect(getSplitValue(result, 'u1')).toBe(2593);
      expect(getSplitValue(result, 'u2')).toBe(2592);
      expect(getSplitValue(result, 'u3')).toBe(1728);
      expect(getSplitValue(result, 'u4')).toBe(864);
      expect(sumSplitValues(result)).toBe(7777);
    });
  });

  // =========================================================================
  // Feature 6: Multi-Payer Expenses & Net Balances
  // =========================================================================
  describe('F-06 & F-07: Multi-Payer Expenses & Net Balances Calculation', () => {
    test('6.1: single expense, single payer, 2 equal beneficiaries', () => {
      const expense: Expense = {
        id: 'exp_1',
        sortieId: 'sortie_1',
        title: 'Lunch',
        amountCents: 5000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T12:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2500 },
          { userId: 'bob', amountCents: 2500 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['alice', 'bob']);
      expect(balances['alice'].totalPaidCents).toBe(5000);
      expect(balances['alice'].totalOwedCents).toBe(2500);
      expect(balances['alice'].netBalanceCents).toBe(2500); // Creditor +25€

      expect(balances['bob'].totalPaidCents).toBe(0);
      expect(balances['bob'].totalOwedCents).toBe(2500);
      expect(balances['bob'].netBalanceCents).toBe(-2500); // Debtor -25€

      // Zero-sum invariant
      expect(balances['alice'].netBalanceCents + balances['bob'].netBalanceCents).toBe(0);
    });

    test('6.2: multi-payer expense (Alice pays 60€, Bob pays 40€ for 100€ dinner)', () => {
      const expense: Expense = {
        id: 'exp_mp',
        sortieId: 'sortie_1',
        title: 'Dinner',
        amountCents: 10000,
        payerId: 'alice',
        payers: [
          { userId: 'alice', amountCents: 6000 },
          { userId: 'bob', amountCents: 4000 },
        ],
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T20:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2500 },
          { userId: 'bob', amountCents: 2500 },
          { userId: 'charlie', amountCents: 2500 },
          { userId: 'david', amountCents: 2500 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['alice', 'bob', 'charlie', 'david']);
      expect(balances['alice'].netBalanceCents).toBe(3500); // Paid 60 - Owed 25 = +35€
      expect(balances['bob'].netBalanceCents).toBe(1500);   // Paid 40 - Owed 25 = +15€
      expect(balances['charlie'].netBalanceCents).toBe(-2500); // -25€
      expect(balances['david'].netBalanceCents).toBe(-2500);   // -25€

      const totalNet = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(totalNet).toBe(0);
    });

    test('6.3: multi-payer where a payer is not a beneficiary (external sponsor)', () => {
      const expense: Expense = {
        id: 'exp_sponsor',
        sortieId: 'sortie_1',
        title: 'Gift from Frank',
        amountCents: 6000,
        payerId: 'frank',
        splitType: 'equal',
        category: 'autre',
        date: '2026-08-17',
        createdBy: 'frank',
        createdAt: '2026-08-17T15:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 3000 },
          { userId: 'bob', amountCents: 3000 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['alice', 'bob', 'frank']);
      expect(balances['frank'].totalPaidCents).toBe(6000);
      expect(balances['frank'].totalOwedCents).toBe(0);
      expect(balances['frank'].netBalanceCents).toBe(6000); // +60€
      expect(balances['alice'].netBalanceCents).toBe(-3000);
      expect(balances['bob'].netBalanceCents).toBe(-3000);
    });

    test('6.4: inactive participant in sortie has 0 paid, 0 owed, 0 net balance', () => {
      const expense: Expense = {
        id: 'exp_1',
        sortieId: 'sortie_1',
        title: 'Coffee',
        amountCents: 600,
        payerId: 'alice',
        splitType: 'equal',
        category: 'bar',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 300 },
          { userId: 'bob', amountCents: 300 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['alice', 'bob', 'charlie_inactive']);
      expect(balances['charlie_inactive'].totalPaidCents).toBe(0);
      expect(balances['charlie_inactive'].totalOwedCents).toBe(0);
      expect(balances['charlie_inactive'].netBalanceCents).toBe(0);
    });

    test('6.5: multiple sequential expenses across 4 participants preserve zero-sum invariant', () => {
      const expenses: Expense[] = [
        {
          id: 'exp_1',
          sortieId: 's1',
          title: 'Tolls',
          amountCents: 3000,
          payerId: 'alice',
          splitType: 'equal',
          category: 'transport',
          date: '2026-08-17',
          createdBy: 'alice',
          createdAt: '2026-08-17T08:00:00Z',
          splits: [
            { userId: 'alice', amountCents: 750 },
            { userId: 'bob', amountCents: 750 },
            { userId: 'charlie', amountCents: 750 },
            { userId: 'david', amountCents: 750 },
          ],
        },
        {
          id: 'exp_2',
          sortieId: 's1',
          title: 'Groceries',
          amountCents: 6000,
          payerId: 'bob',
          splitType: 'equal',
          category: 'courses',
          date: '2026-08-17',
          createdBy: 'bob',
          createdAt: '2026-08-17T13:00:00Z',
          splits: [
            { userId: 'alice', amountCents: 1500 },
            { userId: 'bob', amountCents: 1500 },
            { userId: 'charlie', amountCents: 1500 },
            { userId: 'david', amountCents: 1500 },
          ],
        },
        {
          id: 'exp_3',
          sortieId: 's1',
          title: 'Drinks',
          amountCents: 4000,
          payerId: 'charlie',
          splitType: 'equal',
          category: 'bar',
          date: '2026-08-17',
          createdBy: 'charlie',
          createdAt: '2026-08-17T21:00:00Z',
          splits: [
            { userId: 'alice', amountCents: 1000 },
            { userId: 'bob', amountCents: 1000 },
            { userId: 'charlie', amountCents: 1000 },
            { userId: 'david', amountCents: 1000 },
          ],
        },
      ];

      const participants = ['alice', 'bob', 'charlie', 'david'];
      const balances = calculateNetBalances(expenses, [], participants);

      // Alice: paid 3000, owed 750+1500+1000 = 3250 => -250
      expect(balances['alice'].netBalanceCents).toBe(-250);
      // Bob: paid 6000, owed 3250 => +2750
      expect(balances['bob'].netBalanceCents).toBe(2750);
      // Charlie: paid 4000, owed 3250 => +750
      expect(balances['charlie'].netBalanceCents).toBe(750);
      // David: paid 0, owed 3250 => -3250
      expect(balances['david'].netBalanceCents).toBe(-3250);

      const sumNet = Object.values(balances).reduce((acc, b) => acc + b.netBalanceCents, 0);
      expect(sumNet).toBe(0);
    });
  });

  // =========================================================================
  // Feature 8: Minimal Cash Flow Debt Simplification
  // =========================================================================
  describe('F-08: Minimal Cash Flow Debt Simplification', () => {
    test('8.1: simple 2-person debt results in 1 transfer', () => {
      const netBalances: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 5000, totalOwedCents: 2000, netBalanceCents: 3000 },
        bob: { userId: 'bob', totalPaidCents: 0, totalOwedCents: 3000, netBalanceCents: -3000 },
      };

      const transfers = simplifyDebts(netBalances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'bob',
        toUserId: 'alice',
        amountCents: 3000,
      });
    });

    test('8.2: 3-person chain (A owed 20€, B is net 0, C owes 20€) collapses to 1 transfer from C to A', () => {
      const netBalances: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 4000, totalOwedCents: 2000, netBalanceCents: 2000 },
        bob: { userId: 'bob', totalPaidCents: 2000, totalOwedCents: 2000, netBalanceCents: 0 },
        charlie: { userId: 'charlie', totalPaidCents: 0, totalOwedCents: 2000, netBalanceCents: -2000 },
      };

      const transfers = simplifyDebts(netBalances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'charlie',
        toUserId: 'alice',
        amountCents: 2000,
      });
    });

    test('8.3: 1 debtor with multiple creditors generates exact count of transfers', () => {
      const netBalances: Record<string, UserNetBalance> = {
        debtor: { userId: 'debtor', totalPaidCents: 0, totalOwedCents: 6000, netBalanceCents: -6000 },
        creditor1: { userId: 'creditor1', totalPaidCents: 3000, totalOwedCents: 0, netBalanceCents: 3000 },
        creditor2: { userId: 'creditor2', totalPaidCents: 2000, totalOwedCents: 0, netBalanceCents: 2000 },
        creditor3: { userId: 'creditor3', totalPaidCents: 1000, totalOwedCents: 0, netBalanceCents: 1000 },
      };

      const transfers = simplifyDebts(netBalances);
      expect(transfers).toHaveLength(3);
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBe(6000);
      expect(transfers.every(t => t.fromUserId === 'debtor')).toBe(true);
    });

    test('8.4: multiple debtors with 1 creditor generates exact count of transfers', () => {
      const netBalances: Record<string, UserNetBalance> = {
        creditor: { userId: 'creditor', totalPaidCents: 9000, totalOwedCents: 0, netBalanceCents: 9000 },
        debtor1: { userId: 'debtor1', totalPaidCents: 0, totalOwedCents: 4000, netBalanceCents: -4000 },
        debtor2: { userId: 'debtor2', totalPaidCents: 0, totalOwedCents: 3000, netBalanceCents: -3000 },
        debtor3: { userId: 'debtor3', totalPaidCents: 0, totalOwedCents: 2000, netBalanceCents: -2000 },
      };

      const transfers = simplifyDebts(netBalances);
      expect(transfers).toHaveLength(3);
      expect(transfers.every(t => t.toUserId === 'creditor')).toBe(true);
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBe(9000);
    });

    test('8.5: total transfer volume strictly matches sum of positive net balances', () => {
      const netBalances: Record<string, UserNetBalance> = {
        u1: { userId: 'u1', totalPaidCents: 10000, totalOwedCents: 2000, netBalanceCents: 8000 },
        u2: { userId: 'u2', totalPaidCents: 5000, totalOwedCents: 2000, netBalanceCents: 3000 },
        u3: { userId: 'u3', totalPaidCents: 0, totalOwedCents: 6000, netBalanceCents: -6000 },
        u4: { userId: 'u4', totalPaidCents: 0, totalOwedCents: 5000, netBalanceCents: -5000 },
      };

      const transfers = simplifyDebts(netBalances);
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      const totalPositive = 8000 + 3000;
      expect(totalTransferred).toBe(totalPositive);
      expect(transfers.length).toBeLessThanOrEqual(3);
    });
  });

  // =========================================================================
  // Feature 9: Settlements & Direct Reimbursements
  // =========================================================================
  describe('F-09: Settlements & Direct Reimbursements', () => {
    test('9.1: full settlement zeroes out net balances between debtor and creditor', () => {
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Taxi',
        amountCents: 4000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'transport',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2000 },
          { userId: 'bob', amountCents: 2000 },
        ],
      };

      const settlement: Settlement = {
        id: 'set_1',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 2000,
        date: '2026-08-17',
        createdAt: '2026-08-17T11:00:00Z',
      };

      const balances = calculateNetBalances([expense], [settlement], ['alice', 'bob']);
      expect(balances['alice'].netBalanceCents).toBe(0);
      expect(balances['bob'].netBalanceCents).toBe(0);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('9.2: partial settlement proportionally reduces debt', () => {
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Hotel',
        amountCents: 10000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'logement',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 5000 },
          { userId: 'bob', amountCents: 5000 },
        ],
      };

      const partialSettlement: Settlement = {
        id: 'set_partial',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 2000,
        date: '2026-08-17',
        createdAt: '2026-08-17T12:00:00Z',
      };

      const balances = calculateNetBalances([expense], [partialSettlement], ['alice', 'bob']);
      expect(balances['alice'].netBalanceCents).toBe(3000); // 50€ owed - 20€ paid = 30€
      expect(balances['bob'].netBalanceCents).toBe(-3000);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0].amountCents).toBe(3000);
    });

    test('9.3: multiple sequential settlements across different members', () => {
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Festival',
        amountCents: 9000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'activite',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 3000 },
          { userId: 'bob', amountCents: 3000 },
          { userId: 'charlie', amountCents: 3000 },
        ],
      };

      const settlement1: Settlement = {
        id: 's_bob',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 3000, // Bob pays full debt
        date: '2026-08-17',
        createdAt: '2026-08-17T14:00:00Z',
      };

      const settlement2: Settlement = {
        id: 's_charlie',
        sortieId: 's1',
        payerId: 'charlie',
        recipientId: 'alice',
        amountCents: 1000, // Charlie pays 10€ out of 30€
        date: '2026-08-17',
        createdAt: '2026-08-17T15:00:00Z',
      };

      const balances = calculateNetBalances([expense], [settlement1, settlement2], ['alice', 'bob', 'charlie']);
      expect(balances['bob'].netBalanceCents).toBe(0);
      expect(balances['charlie'].netBalanceCents).toBe(-2000);
      expect(balances['alice'].netBalanceCents).toBe(2000);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'charlie',
        toUserId: 'alice',
        amountCents: 2000,
      });
    });

    test('9.4: maintains zero-sum invariant across 5 participants after 3 settlements', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          sortieId: 's1',
          title: 'Groceries',
          amountCents: 10000,
          payerId: 'u1',
          splitType: 'equal',
          category: 'courses',
          date: '2026-08-17',
          createdBy: 'u1',
          createdAt: '2026-08-17T09:00:00Z',
          splits: ['u1', 'u2', 'u3', 'u4', 'u5'].map(id => ({ userId: id, amountCents: 2000 })),
        },
      ];

      const settlements: Settlement[] = [
        { id: 's1', sortieId: 's1', payerId: 'u2', recipientId: 'u1', amountCents: 2000, date: '2026-08-17', createdAt: '2026-08-17T10:00:00Z' },
        { id: 's2', sortieId: 's1', payerId: 'u3', recipientId: 'u1', amountCents: 1500, date: '2026-08-17', createdAt: '2026-08-17T11:00:00Z' },
        { id: 's3', sortieId: 's1', payerId: 'u4', recipientId: 'u1', amountCents: 500, date: '2026-08-17', createdAt: '2026-08-17T12:00:00Z' },
      ];

      const balances = calculateNetBalances(expenses, settlements, ['u1', 'u2', 'u3', 'u4', 'u5']);
      const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalanceCents, 0);
      expect(sum).toBe(0);
      expect(balances['u2'].netBalanceCents).toBe(0);
      expect(balances['u3'].netBalanceCents).toBe(-500);
      expect(balances['u4'].netBalanceCents).toBe(-1500);
      expect(balances['u5'].netBalanceCents).toBe(-2000);
      expect(balances['u1'].netBalanceCents).toBe(4000);
    });

    test('9.5: settlements correctly track totalPaidCents and totalOwedCents metadata', () => {
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Brunch',
        amountCents: 6000,
        payerId: 'u1',
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'u1',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'u1', amountCents: 3000 },
          { userId: 'u2', amountCents: 3000 },
        ],
      };

      const settlement: Settlement = {
        id: 's1',
        sortieId: 's1',
        payerId: 'u2',
        recipientId: 'u1',
        amountCents: 3000,
        date: '2026-08-17',
        createdAt: '2026-08-17T12:00:00Z',
      };

      const balances = calculateNetBalances([expense], [settlement], ['u1', 'u2']);
      // u1 paid 6000 expense + received 3000 settlement (as owed/debited)
      expect(balances['u1'].totalPaidCents).toBe(6000);
      expect(balances['u1'].totalOwedCents).toBe(6000); // 3000 expense share + 3000 received settlement
      expect(balances['u1'].netBalanceCents).toBe(0);

      // u2 paid 3000 settlement + owed 3000 expense
      expect(balances['u2'].totalPaidCents).toBe(3000);
      expect(balances['u2'].totalOwedCents).toBe(3000);
      expect(balances['u2'].netBalanceCents).toBe(0);
    });
  });
});
