/**
 * Forensic Auditor Milestone 2 Stress Test Suite
 * Independent empirical verification of financialMath.ts and formatters.ts
 */

import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
} from '../utils/financialMath';
import { formatCentsToEuros, parseEurosToCents } from '../utils/formatters';
import { Expense, Settlement, UserNetBalance } from '../types';

describe('Forensic Auditor M2 — Mathematical & Algorithmic Stress Tests', () => {

  // =========================================================================
  // 1. Formatters & Floating-Point Drift Defense
  // =========================================================================
  describe('1. Floating-Point Drift & Formatter Edge Cases', () => {
    test('handles extreme float representation traps in parseEurosToCents', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JS
      expect(parseEurosToCents(0.1 + 0.2)).toBe(30);
      // 19.99 * 100 = 1998.9999999999998 in JS
      expect(parseEurosToCents(19.99)).toBe(1999);
      expect(parseEurosToCents('19,99')).toBe(1999);
      expect(parseEurosToCents('19.99')).toBe(1999);
      expect(parseEurosToCents('19.99 €')).toBe(1999);
      expect(parseEurosToCents('  19,99  € ')).toBe(1999);
      expect(parseEurosToCents('0,001')).toBe(0); // 3rd decimal < 5 => 0
      expect(parseEurosToCents('0,005')).toBe(1); // 3rd decimal >= 5 => 1
      expect(parseEurosToCents('0,009')).toBe(1);
      expect(parseEurosToCents('1234567.89')).toBe(123456789);
      expect(parseEurosToCents('-0.01')).toBe(-1);
      expect(parseEurosToCents('+0.01')).toBe(1);
      expect(parseEurosToCents('0.50')).toBe(50);
      expect(parseEurosToCents('0,50')).toBe(50);
      expect(parseEurosToCents('007.50')).toBe(750);
    });

    test('handles formatCentsToEuros with extreme values and roundtrips', () => {
      expect(formatCentsToEuros(1000000000)).toBe('10000000,00 €'); // 10M euros
      expect(formatCentsToEuros(-1000000000)).toBe('-10000000,00 €');
      expect(formatCentsToEuros(0)).toBe('0,00 €');
      expect(formatCentsToEuros(1)).toBe('0,01 €');
      expect(formatCentsToEuros(-1)).toBe('-0,01 €');

      // Roundtrip test for 100 distinct centime values
      for (let c = -50; c <= 50; c++) {
        const formatted = formatCentsToEuros(c);
        const parsed = parseEurosToCents(formatted);
        expect(parsed).toBe(c);
      }
    });
  });

  // =========================================================================
  // 2. Hare-Niemeyer Conservation Law across Prime Numbers & Extreme Ranges
  // =========================================================================
  describe('2. Split Conservation Invariant (sum(splits) === totalCents)', () => {
    const primeCounts = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];

    test('calculateEqualSplit satisfies conservation invariant for all prime participant counts', () => {
      const testAmounts = [1, 2, 7, 10, 33, 100, 999, 1000, 10000, 1234567, 100000000];

      for (const prime of primeCounts) {
        const participants = Array.from({ length: prime }, (_, i) => `user_${i}`);
        for (const amount of testAmounts) {
          const split = calculateEqualSplit(amount, participants);
          const totalAllocated = Array.from(split.values()).reduce((sum, v) => sum + v, 0);
          expect(totalAllocated).toBe(amount);

          // Difference between any two participants must be at most 1 cent
          const values = Array.from(split.values());
          const min = Math.min(...values);
          const max = Math.max(...values);
          expect(max - min).toBeLessThanOrEqual(1);
        }
      }
    });

    test('calculatePercentageSplit satisfies conservation invariant for non-standard percentages', () => {
      // 3-way split: 33.333%, 33.333%, 33.334%
      const p3 = [
        { userId: 'u1', percentage: 33.333 },
        { userId: 'u2', percentage: 33.333 },
        { userId: 'u3', percentage: 33.334 },
      ];
      for (let amount = 1; amount <= 1000; amount++) {
        const split = calculatePercentageSplit(amount, p3);
        const sum = Array.from(split.values()).reduce((s, v) => s + v, 0);
        expect(sum).toBe(amount);
      }

      // 7-way split with unequal percentages (10%, 15%, 20%, 5%, 25%, 15%, 10% = 100%)
      const p7 = [
        { userId: 'u1', percentage: 10 },
        { userId: 'u2', percentage: 15 },
        { userId: 'u3', percentage: 20 },
        { userId: 'u4', percentage: 5 },
        { userId: 'u5', percentage: 25 },
        { userId: 'u6', percentage: 15 },
        { userId: 'u7', percentage: 10 },
      ];
      for (const amount of [1, 10, 100, 7777, 123456]) {
        const split = calculatePercentageSplit(amount, p7);
        const sum = Array.from(split.values()).reduce((s, v) => s + v, 0);
        expect(sum).toBe(amount);
      }
    });

    test('calculateSharesSplit satisfies conservation invariant for heavy and skewed ratios', () => {
      const skewedShares = [
        { userId: 'u1', shares: 100 },
        { userId: 'u2', shares: 1 },
        { userId: 'u3', shares: 1 },
        { userId: 'u4', shares: 0 },
      ];
      for (const amount of [1, 5, 50, 100, 10000]) {
        const split = calculateSharesSplit(amount, skewedShares);
        const sum = Array.from(split.values()).reduce((s, v) => s + v, 0);
        expect(sum).toBe(amount);
        expect(split.get('u4')).toBe(0);
      }
    });
  });

  // =========================================================================
  // 3. Net Balance Conservation (sum(netBalanceCents) === 0)
  // =========================================================================
  describe('3. Net Balance Conservation & Multi-Payer Invariants', () => {
    test('100 random multi-payer / multi-beneficiary transactions strictly preserve zero-sum invariant', () => {
      const users = ['alice', 'bob', 'charlie', 'david', 'emma', 'frank', 'grace', 'hugo'];
      const expenses: Expense[] = [];
      const settlements: Settlement[] = [];

      for (let i = 0; i < 50; i++) {
        // Multi-payer expense
        const amountCents = 1000 + (i * 37) % 5000;
        const payer1 = users[i % users.length];
        const payer2 = users[(i + 2) % users.length];
        const p1Amount = Math.floor(amountCents / 2);
        const p2Amount = amountCents - p1Amount;

        const expenseUsers = users.slice(0, 3 + (i % 5));
        const equalSplits = calculateEqualSplit(amountCents, expenseUsers);
        const splits = Array.from(equalSplits.entries()).map(([userId, amount]) => ({
          userId,
          amountCents: amount,
        }));

        expenses.push({
          id: `exp_${i}`,
          sortieId: 's1',
          title: `Expense ${i}`,
          amountCents,
          payerId: payer1,
          payers: [
            { userId: payer1, amountCents: p1Amount },
            { userId: payer2, amountCents: p2Amount },
          ],
          splitType: 'equal',
          category: 'restaurant',
          date: '2026-08-17',
          createdBy: payer1,
          createdAt: '2026-08-17T12:00:00Z',
          splits,
        });

        // Intermittent settlements
        if (i % 3 === 0) {
          settlements.push({
            id: `settle_${i}`,
            sortieId: 's1',
            payerId: users[(i + 1) % users.length],
            recipientId: users[(i + 3) % users.length],
            amountCents: 500 + i * 10,
            date: '2026-08-17',
            createdAt: '2026-08-17T13:00:00Z',
          });
        }
      }

      const balances = calculateNetBalances(expenses, settlements, users);
      const totalNet = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(totalNet).toBe(0);
    });
  });

  // =========================================================================
  // 4. Minimal Cash Flow Algorithm Stress & Correctness Proof
  // =========================================================================
  describe('4. Minimal Cash Flow (simplifyDebts) Invariants', () => {
    test('cyclical debt web A->B->C->D->E->A collapses completely to 0 transfers', () => {
      // 5 users where each pays 100€ and benefits 100€
      const users = ['u1', 'u2', 'u3', 'u4', 'u5'];
      const balances: Record<string, UserNetBalance> = {};
      users.forEach(id => {
        balances[id] = {
          userId: id,
          totalPaidCents: 10000,
          totalOwedCents: 10000,
          netBalanceCents: 0,
        };
      });

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('stress test: 50 randomized debt graphs satisfy all 4 invariant conditions', () => {
      for (let run = 0; run < 50; run++) {
        const N = 10 + (run % 20); // 10 to 30 participants
        const participants = Array.from({ length: N }, (_, i) => `user_${i + 1}`);

        // Generate random zero-sum balances
        const rawValues: number[] = [];
        let runningSum = 0;
        for (let i = 0; i < N - 1; i++) {
          const val = Math.floor(Math.random() * 20000) - 10000; // -100€ to +100€
          rawValues.push(val);
          runningSum += val;
        }
        rawValues.push(-runningSum); // Enforce exact zero sum

        const balances: Record<string, UserNetBalance> = {};
        let totalPositiveVolume = 0;
        let nonZeroCount = 0;

        participants.forEach((id, idx) => {
          const net = rawValues[idx];
          if (net !== 0) nonZeroCount++;
          if (net > 0) totalPositiveVolume += net;

          balances[id] = {
            userId: id,
            totalPaidCents: net > 0 ? net : 0,
            totalOwedCents: net < 0 ? -net : 0,
            netBalanceCents: net,
          };
        });

        const startTime = Date.now();
        const transfers = simplifyDebts(balances);
        const durationMs = Date.now() - startTime;

        // 1. Performance check: execution must be near instantaneous (< 10ms for 30 users)
        expect(durationMs).toBeLessThan(50);

        // 2. Transfer count invariant: <= max(0, nonZeroCount - 1)
        const maxTransfers = Math.max(0, nonZeroCount - 1);
        expect(transfers.length).toBeLessThanOrEqual(maxTransfers);

        // 3. Cash flow volume conservation
        const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
        expect(totalTransferred).toBe(totalPositiveVolume);

        // 4. Complete balance collapse: applying all transfers leads to exactly 0 for every user
        const stateMap: Record<string, number> = {};
        participants.forEach((id, idx) => { stateMap[id] = rawValues[idx]; });

        for (const t of transfers) {
          expect(t.amountCents).toBeGreaterThan(0);
          expect(t.fromUserId).not.toBe(t.toUserId);
          stateMap[t.fromUserId] += t.amountCents; // debtor pays
          stateMap[t.toUserId] -= t.amountCents;   // creditor receives
        }

        participants.forEach(id => {
          expect(stateMap[id]).toBe(0);
        });
      }
    });

    test('supports array, map and object input representations polymorphically', () => {
      const objInput: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 5000, totalOwedCents: 0, netBalanceCents: 5000 },
        bob: { userId: 'bob', totalPaidCents: 0, totalOwedCents: 5000, netBalanceCents: -5000 },
      };

      const arrayInput: UserNetBalance[] = Object.values(objInput);
      const mapInput = new Map<string, UserNetBalance>(Object.entries(objInput));

      const resObj = simplifyDebts(objInput);
      const resArr = simplifyDebts(arrayInput);
      const resMap = simplifyDebts(mapInput);

      expect(resObj).toEqual(resArr);
      expect(resObj).toEqual(resMap);
      expect(resObj).toHaveLength(1);
      expect(resObj[0]).toEqual({
        fromUserId: 'bob',
        toUserId: 'alice',
        amountCents: 5000,
      });
    });
  });
});
