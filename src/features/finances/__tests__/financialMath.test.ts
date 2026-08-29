/**
 * Suite de tests unitaires complète pour le moteur mathématique financier de Crazer.
 * Couvre l'arithmétique exacte en centimes, les 4 modes de répartition (Hare-Niemeyer),
 * le support multi-payeurs, la conservation des bilans nets et la simplification de dettes (Minimal Cash Flow).
 */

import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
  financialMathEngine,
} from '../utils/financialMath';
import { formatCentsToEuros, parseEurosToCents, formatDate } from '../utils/formatters';
import { Expense, Settlement, UserNetBalance } from '../types';

describe('Financial Math Engine — Unit Test Suite', () => {

  // =========================================================================
  // 1. Formatters & Parsers
  // =========================================================================
  describe('Formatters & Parsers (Centime Precision)', () => {
    describe('formatCentsToEuros', () => {
      test('formats positive amounts with 2 decimal places and French comma', () => {
        expect(formatCentsToEuros(1050)).toBe('10,50 €');
        expect(formatCentsToEuros(100)).toBe('1,00 €');
        expect(formatCentsToEuros(1)).toBe('0,01 €');
        expect(formatCentsToEuros(0)).toBe('0,00 €');
        expect(formatCentsToEuros(99)).toBe('0,99 €');
        expect(formatCentsToEuros(10000000)).toBe('100000,00 €');
      });

      test('formats negative amounts correctly with minus prefix', () => {
        expect(formatCentsToEuros(-2550)).toBe('-25,50 €');
        expect(formatCentsToEuros(-400)).toBe('-4,00 €');
        expect(formatCentsToEuros(-1)).toBe('-0,01 €');
      });

      test('handles NaN, Infinity and non-number types defensively', () => {
        expect(formatCentsToEuros(NaN)).toBe('0,00 €');
        expect(formatCentsToEuros(Infinity)).toBe('0,00 €');
        expect(formatCentsToEuros(-Infinity)).toBe('0,00 €');
        // @ts-expect-error test non-number
        expect(formatCentsToEuros(undefined)).toBe('0,00 €');
        // @ts-expect-error test non-number
        expect(formatCentsToEuros(null)).toBe('0,00 €');
      });
    });

    describe('parseEurosToCents', () => {
      test('parses numeric values into exact cents without float drift', () => {
        expect(parseEurosToCents(10.50)).toBe(1050);
        expect(parseEurosToCents(0.01)).toBe(1);
        expect(parseEurosToCents(0.00)).toBe(0);
        expect(parseEurosToCents(19.99)).toBe(1999);
        expect(parseEurosToCents(100)).toBe(10000);
      });

      test('parses French formatted strings with comma or dot', () => {
        expect(parseEurosToCents('10,50')).toBe(1050);
        expect(parseEurosToCents('10.50')).toBe(1050);
        expect(parseEurosToCents('0,07')).toBe(7);
        expect(parseEurosToCents('0.07')).toBe(7);
        expect(parseEurosToCents('1,10')).toBe(110);
        expect(parseEurosToCents('12345,67')).toBe(1234567);
      });

      test('parses strings with currency symbol and leading/trailing whitespace', () => {
        expect(parseEurosToCents(' 42,50 € ')).toBe(4250);
        expect(parseEurosToCents('42.50€')).toBe(4250);
        expect(parseEurosToCents('100 €')).toBe(10000);
      });

      test('parses negative string values', () => {
        expect(parseEurosToCents('-25,50 €')).toBe(-2550);
        expect(parseEurosToCents('-10.00')).toBe(-1000);
      });

      test('returns 0 for invalid, empty or non-numeric inputs', () => {
        expect(parseEurosToCents('')).toBe(0);
        expect(parseEurosToCents('   ')).toBe(0);
        expect(parseEurosToCents('abc')).toBe(0);
        expect(parseEurosToCents('€')).toBe(0);
        expect(parseEurosToCents(NaN)).toBe(0);
        expect(parseEurosToCents(null)).toBe(0);
        expect(parseEurosToCents(undefined)).toBe(0);
      });
    });

    describe('formatDate', () => {
      test('formats valid date string to French locale', () => {
        const formatted = formatDate('2026-08-17');
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe('string');
      });

      test('returns original string or empty string for invalid date', () => {
        expect(formatDate('')).toBe('');
        expect(formatDate('invalid-date')).toBe('invalid-date');
      });
    });
  });

  // =========================================================================
  // 2. Equal Split (Hare-Niemeyer)
  // =========================================================================
  describe('calculateEqualSplit (Hare-Niemeyer)', () => {
    test('splits 1 cent among 3 people: [1, 0, 0] with sum = 1', () => {
      const beneficiaries = ['alice', 'bob', 'charlie'];
      const result = calculateEqualSplit(1, beneficiaries);
      expect(result.get('alice')).toBe(1);
      expect(result.get('bob')).toBe(0);
      expect(result.get('charlie')).toBe(0);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(1);
    });

    test('splits 2 cents among 3 people: [1, 1, 0] with sum = 2', () => {
      const beneficiaries = ['alice', 'bob', 'charlie'];
      const result = calculateEqualSplit(2, beneficiaries);
      expect(result.get('alice')).toBe(1);
      expect(result.get('bob')).toBe(1);
      expect(result.get('charlie')).toBe(0);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(2);
    });

    test('splits 10.00€ (1000 cents) among 3 people: [334, 333, 333] with sum = 1000', () => {
      const beneficiaries = ['alice', 'bob', 'charlie'];
      const result = calculateEqualSplit(1000, beneficiaries);
      expect(result.get('alice')).toBe(334);
      expect(result.get('bob')).toBe(333);
      expect(result.get('charlie')).toBe(333);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(1000);
    });

    test('splits 100.00€ (10000 cents) among 7 people with exact sum', () => {
      const members = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7'];
      const result = calculateEqualSplit(10000, members);
      // 10000 / 7 = 1428 remainder 4 => first 4 get 1429, last 3 get 1428
      expect(result.get('m1')).toBe(1429);
      expect(result.get('m2')).toBe(1429);
      expect(result.get('m3')).toBe(1429);
      expect(result.get('m4')).toBe(1429);
      expect(result.get('m5')).toBe(1428);
      expect(result.get('m6')).toBe(1428);
      expect(result.get('m7')).toBe(1428);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(10000);
    });

    test('handles single beneficiary getting 100%', () => {
      const result = calculateEqualSplit(4200, ['alice']);
      expect(result.get('alice')).toBe(4200);
      expect(result.size).toBe(1);
    });

    test('handles 0 total cents cleanly', () => {
      const result = calculateEqualSplit(0, ['alice', 'bob']);
      expect(result.get('alice')).toBe(0);
      expect(result.get('bob')).toBe(0);
    });

    test('returns empty map for empty beneficiary list', () => {
      const result = calculateEqualSplit(5000, []);
      expect(result.size).toBe(0);
    });
  });

  // =========================================================================
  // 3. Exact Split
  // =========================================================================
  describe('calculateExactSplit', () => {
    test('allocates exact amounts when sum matches total', () => {
      const allocations = [
        { userId: 'alice', amountCents: 1500 },
        { userId: 'bob', amountCents: 2500 },
        { userId: 'charlie', amountCents: 1000 },
      ];
      const result = calculateExactSplit(5000, allocations);
      expect(result.get('alice')).toBe(1500);
      expect(result.get('bob')).toBe(2500);
      expect(result.get('charlie')).toBe(1000);
    });

    test('allows one participant taking entire amount and others 0', () => {
      const allocations = [
        { userId: 'alice', amountCents: 7500 },
        { userId: 'bob', amountCents: 0 },
      ];
      const result = calculateExactSplit(7500, allocations);
      expect(result.get('alice')).toBe(7500);
      expect(result.get('bob')).toBe(0);
    });

    test('throws error when sum does not equal total amount', () => {
      const allocations = [
        { userId: 'alice', amountCents: 1000 },
        { userId: 'bob', amountCents: 2000 },
      ];
      expect(() => calculateExactSplit(5000, allocations)).toThrow(
        /does not match total expense amount/
      );
    });

    test('throws error when any allocation amount is negative', () => {
      const allocations = [
        { userId: 'alice', amountCents: -500 },
        { userId: 'bob', amountCents: 1500 },
      ];
      expect(() => calculateExactSplit(1000, allocations)).toThrow(/cannot be negative/);
    });
  });

  // =========================================================================
  // 4. Percentage Split (Hare-Niemeyer)
  // =========================================================================
  describe('calculatePercentageSplit (Hare-Niemeyer)', () => {
    test('splits 33.33%, 33.33%, 33.34% on 100.00€ preserving exact sum', () => {
      const percentages = [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ];
      const result = calculatePercentageSplit(10000, percentages);
      expect(result.get('u1')).toBe(3333);
      expect(result.get('u2')).toBe(3333);
      expect(result.get('u3')).toBe(3334);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(10000);
    });

    test('distributes residual cents according to largest fractional remainder', () => {
      const percentages = [
        { userId: 'u1', percentage: 40 }, // 2617.2 -> 2617 (rem 0.2)
        { userId: 'u2', percentage: 30 }, // 1962.9 -> 1962 (rem 0.9 => +1 = 1963)
        { userId: 'u3', percentage: 20 }, // 1308.6 -> 1308 (rem 0.6 => +1 = 1309)
        { userId: 'u4', percentage: 10 }, //  654.3 ->  654 (rem 0.3)
      ];
      const result = calculatePercentageSplit(6543, percentages);
      expect(result.get('u1')).toBe(2617);
      expect(result.get('u2')).toBe(1963);
      expect(result.get('u3')).toBe(1309);
      expect(result.get('u4')).toBe(654);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(6543);
    });

    test('handles 100% allocated to a single participant in multi-user list', () => {
      const percentages = [
        { userId: 'alice', percentage: 100 },
        { userId: 'bob', percentage: 0 },
        { userId: 'charlie', percentage: 0 },
      ];
      const result = calculatePercentageSplit(5432, percentages);
      expect(result.get('alice')).toBe(5432);
      expect(result.get('bob')).toBe(0);
      expect(result.get('charlie')).toBe(0);
    });

    test('handles 0 total cents cleanly', () => {
      const percentages = [
        { userId: 'alice', percentage: 50 },
        { userId: 'bob', percentage: 50 },
      ];
      const result = calculatePercentageSplit(0, percentages);
      expect(result.get('alice')).toBe(0);
      expect(result.get('bob')).toBe(0);
    });
  });

  // =========================================================================
  // 5. Shares / Weights Split (Hare-Niemeyer)
  // =========================================================================
  describe('calculateSharesSplit (Hare-Niemeyer)', () => {
    test('splits 1:2:3 parts on 100.00€ (10000 cents)', () => {
      const shares = [
        { userId: 'charlie', shares: 1 },
        { userId: 'bob', shares: 2 },
        { userId: 'alice', shares: 3 },
      ];
      const result = calculateSharesSplit(10000, shares);
      expect(result.get('charlie')).toBe(1667);
      expect(result.get('bob')).toBe(3333);
      expect(result.get('alice')).toBe(5000);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(10000);
    });

    test('handles equal shares (1:1:1:1) identically to equal split', () => {
      const shares = [
        { userId: 'u1', shares: 1 },
        { userId: 'u2', shares: 1 },
        { userId: 'u3', shares: 1 },
        { userId: 'u4', shares: 1 },
      ];
      const result = calculateSharesSplit(10000, shares);
      expect(result.get('u1')).toBe(2500);
      expect(result.get('u2')).toBe(2500);
      expect(result.get('u3')).toBe(2500);
      expect(result.get('u4')).toBe(2500);
    });

    test('deterministic tie-breaking when participants have identical fractional remainders', () => {
      const shares = [
        { userId: 'u1', shares: 3 },
        { userId: 'u2', shares: 3 },
        { userId: 'u3', shares: 2 },
        { userId: 'u4', shares: 1 },
      ];
      const result = calculateSharesSplit(7777, shares);
      expect(result.get('u1')).toBe(2593);
      expect(result.get('u2')).toBe(2592);
      expect(result.get('u3')).toBe(1728);
      expect(result.get('u4')).toBe(864);
      expect(Array.from(result.values()).reduce((a, b) => a + b, 0)).toBe(7777);
    });

    test('handles 0 shares for one participant', () => {
      const shares = [
        { userId: 'alice', shares: 3 },
        { userId: 'bob', shares: 0 },
        { userId: 'charlie', shares: 1 },
      ];
      const result = calculateSharesSplit(4000, shares);
      expect(result.get('alice')).toBe(3000);
      expect(result.get('bob')).toBe(0);
      expect(result.get('charlie')).toBe(1000);
    });
  });

  // =========================================================================
  // 6. Net Balances Calculation & Multi-Payer Scenarios
  // =========================================================================
  describe('calculateNetBalances', () => {
    test('single payer, 2 equal beneficiaries', () => {
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

      const balances = calculateNetBalances([expense], [], ['alice', 'bob']);
      expect(balances['alice'].totalPaidCents).toBe(4000);
      expect(balances['alice'].totalOwedCents).toBe(2000);
      expect(balances['alice'].netBalanceCents).toBe(2000);

      expect(balances['bob'].totalPaidCents).toBe(0);
      expect(balances['bob'].totalOwedCents).toBe(2000);
      expect(balances['bob'].netBalanceCents).toBe(-2000);

      // Zero-sum invariant
      expect(balances['alice'].netBalanceCents + balances['bob'].netBalanceCents).toBe(0);
    });

    test('multi-payer expense: Alice pays 60€, Bob pays 40€ for 100€ total', () => {
      const expense: Expense = {
        id: 'e_mp',
        sortieId: 's1',
        title: 'Restaurant',
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
        createdAt: '2026-08-17T12:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2500 },
          { userId: 'bob', amountCents: 2500 },
          { userId: 'charlie', amountCents: 2500 },
          { userId: 'david', amountCents: 2500 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['alice', 'bob', 'charlie', 'david']);
      expect(balances['alice'].netBalanceCents).toBe(3500);  // Paid 60 - Owed 25 = +35€
      expect(balances['bob'].netBalanceCents).toBe(1500);    // Paid 40 - Owed 25 = +15€
      expect(balances['charlie'].netBalanceCents).toBe(-2500); // -25€
      expect(balances['david'].netBalanceCents).toBe(-2500);   // -25€

      const totalNet = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(totalNet).toBe(0);
    });

    test('external sponsor who pays but owes 0 cents', () => {
      const expense: Expense = {
        id: 'e_sponsor',
        sortieId: 's1',
        title: 'Sponsorship',
        amountCents: 5000,
        payerId: 'sponsor',
        splitType: 'equal',
        category: 'autre',
        date: '2026-08-17',
        createdBy: 'sponsor',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2500 },
          { userId: 'bob', amountCents: 2500 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['sponsor', 'alice', 'bob']);
      expect(balances['sponsor'].netBalanceCents).toBe(5000);
      expect(balances['alice'].netBalanceCents).toBe(-2500);
      expect(balances['bob'].netBalanceCents).toBe(-2500);
    });

    test('partial and full direct settlements update balances dynamically', () => {
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Activity',
        amountCents: 6000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'activite',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 3000 },
          { userId: 'bob', amountCents: 3000 },
        ],
      };

      // 1. Partial settlement of 10€ from Bob to Alice
      const s_partial: Settlement = {
        id: 's_part',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 1000,
        date: '2026-08-17',
        createdAt: '2026-08-17T11:00:00Z',
      };

      const partialBalances = calculateNetBalances([expense], [s_partial], ['alice', 'bob']);
      expect(partialBalances['alice'].netBalanceCents).toBe(2000); // 30€ - 10€ = 20€
      expect(partialBalances['bob'].netBalanceCents).toBe(-2000);

      // 2. Full settlement of remaining 20€ from Bob to Alice
      const s_full: Settlement = {
        id: 's_full',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 2000,
        date: '2026-08-17',
        createdAt: '2026-08-17T12:00:00Z',
      };

      const fullBalances = calculateNetBalances([expense], [s_partial, s_full], ['alice', 'bob']);
      expect(fullBalances['alice'].netBalanceCents).toBe(0);
      expect(fullBalances['bob'].netBalanceCents).toBe(0);
    });
  });

  // =========================================================================
  // 7. Debt Simplification (Minimal Cash Flow Algorithm)
  // =========================================================================
  describe('simplifyDebts (Minimal Cash Flow)', () => {
    test('2 people debt results in exactly 1 transfer', () => {
      const balances: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 5000, totalOwedCents: 2500, netBalanceCents: 2500 },
        bob: { userId: 'bob', totalPaidCents: 0, totalOwedCents: 2500, netBalanceCents: -2500 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'bob',
        toUserId: 'alice',
        amountCents: 2500,
      });
    });

    test('3-person chain (A owed 20€, B net 0, C owes 20€) collapses to 1 transfer from C to A', () => {
      const balances: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 4000, totalOwedCents: 2000, netBalanceCents: 2000 },
        bob: { userId: 'bob', totalPaidCents: 2000, totalOwedCents: 2000, netBalanceCents: 0 },
        charlie: { userId: 'charlie', totalPaidCents: 0, totalOwedCents: 2000, netBalanceCents: -2000 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'charlie',
        toUserId: 'alice',
        amountCents: 2000,
      });
    });

    test('circular web (A->B 30€, B->C 30€, C->A 30€) cancels out to 0 transfers', () => {
      const balances: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 3000, totalOwedCents: 3000, netBalanceCents: 0 },
        bob: { userId: 'bob', totalPaidCents: 3000, totalOwedCents: 3000, netBalanceCents: 0 },
        charlie: { userId: 'charlie', totalPaidCents: 3000, totalOwedCents: 3000, netBalanceCents: 0 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('asymmetric 4-way circular web simplifies into minimal direct transfers', () => {
      // Alice: +60€, Bob: -20€, Charlie: -20€, David: -20€
      const balances: Record<string, UserNetBalance> = {
        alice: { userId: 'alice', totalPaidCents: 10000, totalOwedCents: 4000, netBalanceCents: 6000 },
        bob: { userId: 'bob', totalPaidCents: 8000, totalOwedCents: 10000, netBalanceCents: -2000 },
        charlie: { userId: 'charlie', totalPaidCents: 6000, totalOwedCents: 8000, netBalanceCents: -2000 },
        david: { userId: 'david', totalPaidCents: 4000, totalOwedCents: 6000, netBalanceCents: -2000 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(3);
      expect(transfers.every(t => t.toUserId === 'alice')).toBe(true);
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBe(6000);
    });

    test('scales correctly to 10 participants with <= N - 1 transfers', () => {
      // 3 creditors (+50€, +30€, +20€ = +100€)
      // 4 debtors (-40€, -30€, -20€, -10€ = -100€)
      // 3 neutral members (0€)
      const balances: Record<string, UserNetBalance> = {
        c1: { userId: 'c1', totalPaidCents: 5000, totalOwedCents: 0, netBalanceCents: 5000 },
        c2: { userId: 'c2', totalPaidCents: 3000, totalOwedCents: 0, netBalanceCents: 3000 },
        c3: { userId: 'c3', totalPaidCents: 2000, totalOwedCents: 0, netBalanceCents: 2000 },
        d1: { userId: 'd1', totalPaidCents: 0, totalOwedCents: 4000, netBalanceCents: -4000 },
        d2: { userId: 'd2', totalPaidCents: 0, totalOwedCents: 3000, netBalanceCents: -3000 },
        d3: { userId: 'd3', totalPaidCents: 0, totalOwedCents: 2000, netBalanceCents: -2000 },
        d4: { userId: 'd4', totalPaidCents: 0, totalOwedCents: 1000, netBalanceCents: -1000 },
        n1: { userId: 'n1', totalPaidCents: 0, totalOwedCents: 0, netBalanceCents: 0 },
        n2: { userId: 'n2', totalPaidCents: 0, totalOwedCents: 0, netBalanceCents: 0 },
        n3: { userId: 'n3', totalPaidCents: 0, totalOwedCents: 0, netBalanceCents: 0 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(6); // <= (3 + 4 - 1) = 6
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBe(10000);
    });

    test('complex 20 participants simulation: executing all suggested transfers brings every balance to exactly 0', () => {
      const participants = Array.from({ length: 20 }, (_, i) => `user_${i + 1}`);
      const balances: Record<string, UserNetBalance> = {};

      // Seed deliberate positive and negative amounts summing to 0
      const amounts = [
        10000, 8500, 7200, 6000, 5000, 4000, 3000, 2000, 1500, 500, // Creditors: sum = 47700
        -12000, -9500, -8200, -6000, -4500, -3500, -2000, -1000, -1000, 0, // Debtors: sum = -47700
      ];

      participants.forEach((id, idx) => {
        const net = amounts[idx];
        balances[id] = {
          userId: id,
          totalPaidCents: net > 0 ? net : 0,
          totalOwedCents: net < 0 ? -net : 0,
          netBalanceCents: net,
        };
      });

      const transfers = simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(19);

      // Verify total volume equals total positive credit
      const totalVolume = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalVolume).toBe(47700);

      // Simulate applying all transfers
      const netMap: Record<string, number> = {};
      participants.forEach((id, i) => { netMap[id] = amounts[i]; });

      for (const t of transfers) {
        netMap[t.fromUserId] += t.amountCents; // debtor pays, reducing negative debt
        netMap[t.toUserId] -= t.amountCents;   // creditor receives, reducing positive credit
      }

      participants.forEach(id => {
        expect(netMap[id]).toBe(0);
      });
    });
  });

  // =========================================================================
  // 8. FinancialMathEngine Interface Contract
  // =========================================================================
  describe('FinancialMathEngine contract implementation', () => {
    test('exports financialMathEngine conforming to interface contract', () => {
      expect(financialMathEngine).toBeDefined();
      expect(typeof financialMathEngine.calculateEqualSplit).toBe('function');
      expect(typeof financialMathEngine.calculatePercentageSplit).toBe('function');
      expect(typeof financialMathEngine.calculateSharesSplit).toBe('function');
      expect(typeof financialMathEngine.calculateNetBalances).toBe('function');
      expect(typeof financialMathEngine.simplifyDebts).toBe('function');
    });
  });
});
