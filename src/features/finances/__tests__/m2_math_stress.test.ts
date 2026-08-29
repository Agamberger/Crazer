/**
 * EMPIRICAL CHALLENGER — Milestone 2: Mathematical Invariants & Precision Stress Test Harness
 *
 * Exhaustive property-based testing and adversarial stress testing for:
 * 1. Hare-Niemeyer split algorithms (Equal, Percentage, Shares) -> sum(splits) === totalCents
 * 2. Net Balances Invariant -> sum(netBalanceCents) === 0
 * 3. Minimal Cash Flow Debt Simplification -> exact convergence to 0 in <= N-1 transfers
 * 4. Zero-drift Centime Formatters & Parsers -> float traps, rounding, round-trip fidelity
 * 5. Execution Performance Benchmark -> < 5ms for 20+ participants
 */

import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
} from '../utils/financialMath';
import { formatCentsToEuros, parseEurosToCents } from '../utils/formatters';
import { Expense, Settlement, UserNetBalance } from '../types';

// Deterministic Pseudo-Random Number Generator (PRNG) for reproducible property-based testing
class SeededPRNG {
  private state: number;
  constructor(seed = 123456789) {
    this.state = seed;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

describe('Milestone 2 — Empirical Mathematical Stress & Invariant Harness', () => {
  const prng = new SeededPRNG(42);

  // =========================================================================
  // 1. Invariant 1: Equal Split Sum Conservation
  // =========================================================================
  describe('Invariant 1: calculateEqualSplit (Hare-Niemeyer)', () => {
    it('conserves exact totalCents over 2,500 randomized property-based trials (N: 1..50, T: 1..10,000,000 cents)', () => {
      const iterations = 2500;
      for (let i = 0; i < iterations; i++) {
        const participantCount = prng.nextInt(1, 50);
        const totalCents = prng.nextInt(1, 10_000_000); // 0.01€ to 100,000.00€
        const participants = Array.from({ length: participantCount }, (_, idx) => `user_${idx}`);

        const result = calculateEqualSplit(totalCents, participants);

        expect(result.size).toBe(participantCount);

        let sum = 0;
        let maxAllocation = -Infinity;
        let minAllocation = Infinity;
        let countMax = 0;

        for (const amount of result.values()) {
          expect(Number.isInteger(amount)).toBe(true);
          expect(amount).toBeGreaterThanOrEqual(0);
          sum += amount;
          if (amount > maxAllocation) maxAllocation = amount;
          if (amount < minAllocation) minAllocation = amount;
        }

        // Invariant: sum of splits must strictly equal totalCents
        expect(sum).toBe(totalCents);

        // Invariant: spread between highest and lowest allocation is at most 1 cent
        expect(maxAllocation - minAllocation).toBeLessThanOrEqual(1);

        // Invariant: exactly (totalCents % participantCount) participants receive (base + 1)
        const expectedRemainder = totalCents % participantCount;
        for (const amount of result.values()) {
          if (amount === Math.floor(totalCents / participantCount) + 1) {
            countMax++;
          }
        }
        if (expectedRemainder === 0) {
          expect(maxAllocation).toBe(minAllocation);
        } else {
          expect(countMax).toBe(expectedRemainder);
        }
      }
    });

    it('handles extreme adversarial edge cases for equal split', () => {
      // 1 cent among 50 people
      const p50 = Array.from({ length: 50 }, (_, i) => `u_${i}`);
      const res1 = calculateEqualSplit(1, p50);
      expect(res1.get('u_0')).toBe(1);
      for (let i = 1; i < 50; i++) {
        expect(res1.get(`u_${i}`)).toBe(0);
      }
      expect(Array.from(res1.values()).reduce((a, b) => a + b, 0)).toBe(1);

      // 49 cents among 50 people
      const res49 = calculateEqualSplit(49, p50);
      for (let i = 0; i < 49; i++) {
        expect(res49.get(`u_${i}`)).toBe(1);
      }
      expect(res49.get('u_49')).toBe(0);
      expect(Array.from(res49.values()).reduce((a, b) => a + b, 0)).toBe(49);

      // 0 cents and negative amounts
      expect(Array.from(calculateEqualSplit(0, p50).values()).reduce((a, b) => a + b, 0)).toBe(0);
      expect(Array.from(calculateEqualSplit(-500, p50).values()).reduce((a, b) => a + b, 0)).toBe(0);

      // Empty list
      expect(calculateEqualSplit(1000, []).size).toBe(0);
    });
  });

  // =========================================================================
  // 2. Invariant 2: Percentage Split Sum Conservation
  // =========================================================================
  describe('Invariant 2: calculatePercentageSplit (Hare-Niemeyer)', () => {
    it('conserves exact totalCents over 2,500 randomized property-based trials', () => {
      const iterations = 2500;
      for (let i = 0; i < iterations; i++) {
        const participantCount = prng.nextInt(1, 30);
        const totalCents = prng.nextInt(1, 5_000_000);

        // Generate random weights and normalize to percentages summing to 100%
        const rawWeights = Array.from({ length: participantCount }, () => prng.nextFloat(0.1, 100));
        const rawSum = rawWeights.reduce((a, b) => a + b, 0);
        const percentages = rawWeights.map((w, idx) => ({
          userId: `usr_${idx}`,
          percentage: (w / rawSum) * 100,
        }));

        const result = calculatePercentageSplit(totalCents, percentages);

        let sum = 0;
        for (const amount of result.values()) {
          expect(Number.isInteger(amount)).toBe(true);
          expect(amount).toBeGreaterThanOrEqual(0);
          sum += amount;
        }

        // Invariant: sum must equal totalCents exactly
        expect(sum).toBe(totalCents);
      }
    });

    it('handles tricky fractional percentage distributions without float drift', () => {
      // 3-way split: 33.333%, 33.333%, 33.334%
      const percentages3 = [
        { userId: 'u1', percentage: 33.333333333333336 },
        { userId: 'u2', percentage: 33.333333333333336 },
        { userId: 'u3', percentage: 33.333333333333336 },
      ];
      const res = calculatePercentageSplit(1000, percentages3);
      expect(Array.from(res.values()).reduce((a, b) => a + b, 0)).toBe(1000);

      // 7-way split on 1 cent
      const percentages7 = Array.from({ length: 7 }, (_, i) => ({
        userId: `u_${i}`,
        percentage: 100 / 7,
      }));
      const res7 = calculatePercentageSplit(1, percentages7);
      expect(Array.from(res7.values()).reduce((a, b) => a + b, 0)).toBe(1);

      // Zero total percentage
      const zeroP = [
        { userId: 'u1', percentage: 0 },
        { userId: 'u2', percentage: 0 },
      ];
      const resZ = calculatePercentageSplit(5000, zeroP);
      expect(resZ.get('u1')).toBe(0);
      expect(resZ.get('u2')).toBe(0);
    });
  });

  // =========================================================================
  // 3. Invariant 3: Shares / Weights Split Sum Conservation
  // =========================================================================
  describe('Invariant 3: calculateSharesSplit (Hare-Niemeyer)', () => {
    it('conserves exact totalCents over 2,500 randomized property-based trials', () => {
      const iterations = 2500;
      for (let i = 0; i < iterations; i++) {
        const participantCount = prng.nextInt(1, 40);
        const totalCents = prng.nextInt(1, 10_000_000);

        const shares = Array.from({ length: participantCount }, (_, idx) => ({
          userId: `usr_${idx}`,
          shares: prng.nextInt(1, 20),
        }));

        const result = calculateSharesSplit(totalCents, shares);

        let sum = 0;
        for (const amount of result.values()) {
          expect(Number.isInteger(amount)).toBe(true);
          expect(amount).toBeGreaterThanOrEqual(0);
          sum += amount;
        }

        // Invariant: sum strictly equals totalCents
        expect(sum).toBe(totalCents);
      }
    });

    it('preserves monotonicity between shares and allocated amounts', () => {
      const shares = [
        { userId: 'low', shares: 1 },
        { userId: 'med', shares: 3 },
        { userId: 'high', shares: 10 },
      ];
      const result = calculateSharesSplit(10000, shares);
      expect(result.get('low')!).toBeLessThan(result.get('med')!);
      expect(result.get('med')!).toBeLessThan(result.get('high')!);
      expect(result.get('low')! + result.get('med')! + result.get('high')!).toBe(10000);
    });
  });

  // =========================================================================
  // 4. Invariant 4: Exact Split Validation
  // =========================================================================
  describe('Invariant 4: calculateExactSplit', () => {
    it('accepts exact partitions and rejects sum discrepancies over 1,000 trials', () => {
      for (let i = 0; i < 1000; i++) {
        const count = prng.nextInt(2, 10);
        const amounts = Array.from({ length: count }, () => prng.nextInt(100, 10000));
        const totalCents = amounts.reduce((a, b) => a + b, 0);

        const allocations = amounts.map((amt, idx) => ({
          userId: `u_${idx}`,
          amountCents: amt,
        }));

        // Valid exact split
        const validRes = calculateExactSplit(totalCents, allocations);
        expect(Array.from(validRes.values()).reduce((a, b) => a + b, 0)).toBe(totalCents);

        // Invalid: discrepancy of +1 cent
        expect(() => calculateExactSplit(totalCents + 1, allocations)).toThrow(
          /does not match total expense amount/
        );

        // Invalid: discrepancy of -1 cent
        expect(() => calculateExactSplit(totalCents - 1, allocations)).toThrow(
          /does not match total expense amount/
        );
      }
    });
  });

  // =========================================================================
  // 5. Invariant 5: Net Balances Zero-Sum Conservation (sum(balances) === 0)
  // =========================================================================
  describe('Invariant 5: calculateNetBalances Zero-Sum Invariant', () => {
    it('conserves sum(netBalanceCents) === 0 over 2,500 randomized expense & settlement histories', () => {
      const iterations = 2500;
      for (let iter = 0; iter < iterations; iter++) {
        const participantCount = prng.nextInt(2, 25);
        const participants = Array.from({ length: participantCount }, (_, i) => `user_${i}`);

        const expenseCount = prng.nextInt(1, 30);
        const settlementCount = prng.nextInt(0, 15);

        const expenses: Expense[] = [];
        for (let e = 0; e < expenseCount; e++) {
          const totalCents = prng.nextInt(100, 100000);
          const isMultiPayer = prng.next() > 0.6;

          // Generate payers
          let payers: { userId: string; amountCents: number }[] | undefined;
          let payerId: string = participants[prng.nextInt(0, participantCount - 1)];

          if (isMultiPayer) {
            const payerCount = prng.nextInt(2, Math.min(5, participantCount));
            const selectedPayers = [...participants]
              .sort(() => prng.next() - 0.5)
              .slice(0, payerCount);
            const rawPayerSplit = calculateEqualSplit(totalCents, selectedPayers);
            payers = Array.from(rawPayerSplit.entries()).map(([uId, amt]) => ({
              userId: uId,
              amountCents: amt,
            }));
            payerId = selectedPayers[0];
          }

          // Generate beneficiaries
          const beneficiaryCount = prng.nextInt(1, participantCount);
          const selectedBeneficiaries = [...participants]
            .sort(() => prng.next() - 0.5)
            .slice(0, beneficiaryCount);

          const splitMap = calculateEqualSplit(totalCents, selectedBeneficiaries);
          const splits = Array.from(splitMap.entries()).map(([uId, amt]) => ({
            userId: uId,
            amountCents: amt,
          }));

          expenses.push({
            id: `exp_${e}`,
            sortieId: 's1',
            title: `Expense ${e}`,
            amountCents: totalCents,
            payerId,
            payers,
            splitType: 'equal',
            category: 'autre',
            date: '2026-08-17',
            createdBy: payerId,
            createdAt: '2026-08-17T10:00:00Z',
            splits,
          });
        }

        // Generate settlements
        const settlements: Settlement[] = [];
        for (let s = 0; s < settlementCount; s++) {
          const pIdx = prng.nextInt(0, participantCount - 1);
          let rIdx = prng.nextInt(0, participantCount - 1);
          while (rIdx === pIdx) {
            rIdx = (rIdx + 1) % participantCount;
          }
          settlements.push({
            id: `settle_${s}`,
            sortieId: 's1',
            payerId: participants[pIdx],
            recipientId: participants[rIdx],
            amountCents: prng.nextInt(50, 5000),
            date: '2026-08-17',
            createdAt: '2026-08-17T12:00:00Z',
          });
        }

        const balances = calculateNetBalances(expenses, settlements, participants);

        let sumNet = 0;
        let sumPaid = 0;
        let sumOwed = 0;

        for (const p of participants) {
          const b = balances[p];
          expect(b).toBeDefined();
          expect(b.netBalanceCents).toBe(b.totalPaidCents - b.totalOwedCents);
          sumNet += b.netBalanceCents;
          sumPaid += b.totalPaidCents;
          sumOwed += b.totalOwedCents;
        }

        // Invariant: sum of net balances is strictly 0
        expect(sumNet).toBe(0);
        // Invariant: total paid equals total owed across the whole group
        expect(sumPaid).toBe(sumOwed);
      }
    });
  });

  // =========================================================================
  // 6. Invariant 6: Debt Simplification Convergence & Soundness
  // =========================================================================
  describe('Invariant 6: simplifyDebts Convergence & Soundness', () => {
    it('completely resolves all net balances to exactly 0 in <= N-1 transfers across 2,500 random groups', () => {
      const iterations = 2500;
      for (let iter = 0; iter < iterations; iter++) {
        const participantCount = prng.nextInt(2, 50);
        const participants = Array.from({ length: participantCount }, (_, i) => `user_${i}`);

        // Generate random zero-sum balances
        // Strategy: pair-wise random transactions creating arbitrary net balances
        const netAmounts: Record<string, number> = {};
        participants.forEach(p => { netAmounts[p] = 0; });

        const txCount = prng.nextInt(1, 100);
        for (let t = 0; t < txCount; t++) {
          const from = participants[prng.nextInt(0, participantCount - 1)];
          let to = participants[prng.nextInt(0, participantCount - 1)];
          while (to === from) {
            to = participants[(participants.indexOf(to) + 1) % participantCount];
          }
          const amt = prng.nextInt(1, 50000);
          netAmounts[from] += amt;
          netAmounts[to] -= amt;
        }

        const balances: Record<string, UserNetBalance> = {};
        participants.forEach(p => {
          const net = netAmounts[p];
          balances[p] = {
            userId: p,
            totalPaidCents: net > 0 ? net : 0,
            totalOwedCents: net < 0 ? -net : 0,
            netBalanceCents: net,
          };
        });

        const initialDebtors = Object.values(balances).filter(b => b.netBalanceCents < 0);
        const initialCreditors = Object.values(balances).filter(b => b.netBalanceCents > 0);
        const totalCreditVolume = initialCreditors.reduce((sum, c) => sum + c.netBalanceCents, 0);

        const transfers = simplifyDebts(balances);

        // Invariant: number of transfers <= N - 1
        expect(transfers.length).toBeLessThanOrEqual(participantCount - 1);

        // Invariant: number of transfers <= (|Debtors| + |Creditors| - 1)
        if (initialDebtors.length > 0 && initialCreditors.length > 0) {
          expect(transfers.length).toBeLessThanOrEqual(
            initialDebtors.length + initialCreditors.length - 1
          );
        } else {
          expect(transfers.length).toBe(0);
        }

        // Invariant: all transfer amounts are strictly positive integers
        for (const tr of transfers) {
          expect(Number.isInteger(tr.amountCents)).toBe(true);
          expect(tr.amountCents).toBeGreaterThan(0);
          expect(tr.fromUserId).not.toBe(tr.toUserId);
        }

        // Invariant: total transfer volume matches total positive credit exactly
        const totalTransferred = transfers.reduce((sum, tr) => sum + tr.amountCents, 0);
        expect(totalTransferred).toBe(totalCreditVolume);

        // Invariant: applying transfers brings all balances to exactly 0
        const simBalances = { ...netAmounts };
        for (const tr of transfers) {
          simBalances[tr.fromUserId] += tr.amountCents; // debtor pays
          simBalances[tr.toUserId] -= tr.amountCents;   // creditor receives
        }

        for (const p of participants) {
          expect(simBalances[p]).toBe(0);
        }
      }
    });

    it('handles Map, Array, and Record inputs identically', () => {
      const b1: UserNetBalance = { userId: 'u1', totalPaidCents: 3000, totalOwedCents: 0, netBalanceCents: 3000 };
      const b2: UserNetBalance = { userId: 'u2', totalPaidCents: 0, totalOwedCents: 3000, netBalanceCents: -3000 };

      const recordInput: Record<string, UserNetBalance> = { u1: b1, u2: b2 };
      const arrayInput: UserNetBalance[] = [b1, b2];
      const mapInput = new Map<string, UserNetBalance>([['u1', b1], ['u2', b2]]);

      const resRecord = simplifyDebts(recordInput);
      const resArray = simplifyDebts(arrayInput);
      const resMap = simplifyDebts(mapInput);

      expect(resRecord).toEqual(resArray);
      expect(resRecord).toEqual(resMap);
      expect(resRecord).toHaveLength(1);
      expect(resRecord[0]).toEqual({ fromUserId: 'u2', toUserId: 'u1', amountCents: 3000 });
    });
  });

  // =========================================================================
  // 7. Precision & Formatter Traps Stress Test
  // =========================================================================
  describe('Precision & Formatter Traps (formatCentsToEuros & parseEurosToCents)', () => {
    it('correctly parses classic IEEE-754 floating point trap numbers', () => {
      const traps = [
        { float: 19.99, expectedCents: 1999 },
        { float: 0.07, expectedCents: 7 },
        { float: 0.14, expectedCents: 14 },
        { float: 0.28, expectedCents: 28 },
        { float: 0.29, expectedCents: 29 },
        { float: 0.57, expectedCents: 57 },
        { float: 0.58, expectedCents: 58 },
        { float: 1.13, expectedCents: 113 },
        { float: 1.14, expectedCents: 114 },
        { float: 1.15, expectedCents: 115 },
        { float: 1.16, expectedCents: 116 },
        { float: 4.19, expectedCents: 419 },
        { float: 4.20, expectedCents: 420 },
        { float: 9.99, expectedCents: 999 },
        { float: 100.05, expectedCents: 10005 },
        { float: 999.99, expectedCents: 99999 },
      ];

      for (const { float, expectedCents } of traps) {
        expect(parseEurosToCents(float)).toBe(expectedCents);
        expect(parseEurosToCents(float.toString())).toBe(expectedCents);
      }
    });

    it('guarantees round-trip formatting fidelity (parse(format(cents)) === cents) for 10,000 values', () => {
      for (let i = 0; i < 10000; i++) {
        const cents = prng.nextInt(-10_000_000, 10_000_000);
        const formatted = formatCentsToEuros(cents);
        const parsed = parseEurosToCents(formatted);
        expect(parsed).toBe(cents);
      }
    });

    it('safely parses hostile or malformed string inputs', () => {
      expect(parseEurosToCents('---50')).toBe(0);
      expect(parseEurosToCents('12.34.56')).toBe(0);
      expect(parseEurosToCents('12,34,56')).toBe(0);
      expect(parseEurosToCents('12e3')).toBe(0);
      expect(parseEurosToCents('0x10')).toBe(0);
      expect(parseEurosToCents('Infinity')).toBe(0);
      expect(parseEurosToCents('-Infinity')).toBe(0);
      expect(parseEurosToCents('<script>alert(1)</script>')).toBe(0);
      expect(parseEurosToCents('   - 00012,34 €   ')).toBe(-1234);
    });
  });

  // =========================================================================
  // 8. Performance Benchmarking (< 5ms for 20+ participants)
  // =========================================================================
  describe('Performance Benchmarking & Complexity Validation', () => {
    it('executes simplifyDebts in < 5ms for 20, 50, and 100 participants over 1,000 iterations', () => {
      const benchmarkSizes = [20, 50, 100];

      for (const size of benchmarkSizes) {
        const participants = Array.from({ length: size }, (_, i) => `user_${i}`);
        const runs = 1000;

        let totalDurationMs = 0;
        let maxSingleRunMs = 0;

        // Warm-up to ensure JIT compilation
        for (let w = 0; w < 20; w++) {
          const warmBalances: Record<string, UserNetBalance> = {};
          participants.forEach((p, idx) => {
            const net = idx === size - 1 ? 0 : 100;
            warmBalances[p] = {
              userId: p,
              totalPaidCents: net > 0 ? net : 0,
              totalOwedCents: net < 0 ? -net : 0,
              netBalanceCents: net,
            };
          });
          simplifyDebts(warmBalances);
        }

        const runTimes: number[] = [];
        for (let r = 0; r < runs; r++) {
          const balances: Record<string, UserNetBalance> = {};
          let remainingNet = 0;

          participants.forEach((p, idx) => {
            if (idx === size - 1) {
              const net = -remainingNet;
              balances[p] = {
                userId: p,
                totalPaidCents: net > 0 ? net : 0,
                totalOwedCents: net < 0 ? -net : 0,
                netBalanceCents: net,
              };
            } else {
              const net = prng.nextInt(-10000, 10000);
              remainingNet += net;
              balances[p] = {
                userId: p,
                totalPaidCents: net > 0 ? net : 0,
                totalOwedCents: net < 0 ? -net : 0,
                netBalanceCents: net,
              };
            }
          });

          const startTime = performance.now();
          const transfers = simplifyDebts(balances);
          const elapsed = performance.now() - startTime;

          runTimes.push(elapsed);
          totalDurationMs += elapsed;
          if (elapsed > maxSingleRunMs) {
            maxSingleRunMs = elapsed;
          }

          expect(transfers.length).toBeLessThanOrEqual(size - 1);
        }

        const avgDurationMs = totalDurationMs / runs;
        runTimes.sort((a, b) => a - b);
        const p99DurationMs = runTimes[Math.floor(runs * 0.99)];

        // Performance requirement: avg runtime << 5ms, p99 < 5ms
        expect(avgDurationMs).toBeLessThan(1.0); // strictly < 1ms (typical is ~0.05ms)
        expect(p99DurationMs).toBeLessThan(5.0); // 99th percentile well under 5ms
      }
    });

    it('executes calculateNetBalances for 100 expenses across 50 participants in < 5ms', () => {
      const participants = Array.from({ length: 50 }, (_, i) => `user_${i}`);
      const expenses: Expense[] = [];

      for (let i = 0; i < 100; i++) {
        const payerId = participants[i % 50];
        const beneficiaries = participants.slice(0, 25);
        const splitMap = calculateEqualSplit(5000, beneficiaries);
        const splits = Array.from(splitMap.entries()).map(([uId, amt]) => ({
          userId: uId,
          amountCents: amt,
        }));

        expenses.push({
          id: `exp_${i}`,
          sortieId: 's1',
          title: `Expense ${i}`,
          amountCents: 5000,
          payerId,
          splitType: 'equal',
          category: 'restaurant',
          date: '2026-08-17',
          createdBy: payerId,
          createdAt: '2026-08-17T10:00:00Z',
          splits,
        });
      }

      const startTime = performance.now();
      const balances = calculateNetBalances(expenses, [], participants);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(5.0);
      const totalNet = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(totalNet).toBe(0);
    });
  });
});
