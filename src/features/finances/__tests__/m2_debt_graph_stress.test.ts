/**
 * M2 Stress Test Suite: Graph Debt Simplification & Minimal Cash Flow
 *
 * Empirical challenger tests covering:
 * 1. Circular Debts (3-node, 4-node, 10-node, 50-node cycles and zero-net cancellation)
 * 2. Multi-Payer Asymmetrical Graphs & Dense Bipartite Networks
 * 3. Max Transfers Bound (Strictly <= N - 1 and <= |D| + |C| - 1)
 * 4. Partial and Over-Settlement Sequences & Reversals
 * 5. Disconnected Subgraphs and Independent Debt Clusters
 * 6. Property-Based Randomized Fuzzing (100+ random group worlds, 1000s of transactions)
 * 7. Extreme Scale (N=500 participants) and Large Integer Conservation
 */

import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
} from '../utils/financialMath';
import { Expense, Settlement, UserNetBalance, SuggestedTransfer } from '../types';

describe('Milestone 2 Challenger — Graph Debt Simplification Stress Tests', () => {

  // Helper: Verify that applying all suggested transfers completely clears all balances to 0
  function verifyDebtResolution(
    initialBalances: Record<string, UserNetBalance>,
    transfers: SuggestedTransfer[]
  ) {
    const simulation: Record<string, number> = {};
    for (const [userId, bal] of Object.entries(initialBalances)) {
      simulation[userId] = bal.netBalanceCents;
    }

    const totalDebtorDeficit = Object.values(initialBalances)
      .filter(b => b.netBalanceCents < 0)
      .reduce((sum, b) => sum + Math.abs(b.netBalanceCents), 0);

    const totalCreditorSurplus = Object.values(initialBalances)
      .filter(b => b.netBalanceCents > 0)
      .reduce((sum, b) => sum + b.netBalanceCents, 0);

    // Invariant: Total surplus must equal total deficit
    expect(totalDebtorDeficit).toBe(totalCreditorSurplus);

    let totalTransferredVolume = 0;

    for (const transfer of transfers) {
      expect(transfer.amountCents).toBeGreaterThan(0);
      expect(transfer.fromUserId).not.toBe(transfer.toUserId);

      // Debtor pays: balance increases towards 0
      simulation[transfer.fromUserId] += transfer.amountCents;
      // Creditor receives: balance decreases towards 0
      simulation[transfer.toUserId] -= transfer.amountCents;

      totalTransferredVolume += transfer.amountCents;
    }

    // Invariant: Total transferred volume must equal total surplus
    expect(totalTransferredVolume).toBe(totalCreditorSurplus);

    // Invariant: After transfers, all participants must have exactly 0 net balance
    for (const net of Object.values(simulation)) {
      expect(net).toBe(0);
    }
  }

  // =========================================================================
  // 1. Circular Debts & Cyclic Graphs
  // =========================================================================
  describe('1. Circular Debts & Cyclic Graph Cancellation', () => {
    test('3-Node Cycle (A -> B -> C -> A) with 50.00€ each cancels completely (0 transfers)', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          sortieId: 's1',
          title: 'A pays for B',
          amountCents: 5000,
          payerId: 'user_A',
          splitType: 'exact',
          category: 'activite',
          date: '2026-08-17',
          createdBy: 'user_A',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'user_B', amountCents: 5000 }],
        },
        {
          id: 'e2',
          sortieId: 's1',
          title: 'B pays for C',
          amountCents: 5000,
          payerId: 'user_B',
          splitType: 'exact',
          category: 'bar',
          date: '2026-08-17',
          createdBy: 'user_B',
          createdAt: '2026-08-17T11:00:00Z',
          splits: [{ userId: 'user_C', amountCents: 5000 }],
        },
        {
          id: 'e3',
          sortieId: 's1',
          title: 'C pays for A',
          amountCents: 5000,
          payerId: 'user_C',
          splitType: 'exact',
          category: 'restaurant',
          date: '2026-08-17',
          createdBy: 'user_C',
          createdAt: '2026-08-17T12:00:00Z',
          splits: [{ userId: 'user_A', amountCents: 5000 }],
        },
      ];

      const balances = calculateNetBalances(expenses, [], ['user_A', 'user_B', 'user_C']);
      expect(balances['user_A'].netBalanceCents).toBe(0);
      expect(balances['user_B'].netBalanceCents).toBe(0);
      expect(balances['user_C'].netBalanceCents).toBe(0);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('4-Node Cycle (A -> B -> C -> D -> A) with equal 100.00€ cancels completely (0 transfers)', () => {
      const users = ['A', 'B', 'C', 'D'];
      const expenses: Expense[] = users.map((u, i) => {
        const nextUser = users[(i + 1) % users.length];
        return {
          id: `exp_${u}`,
          sortieId: 's1',
          title: `${u} pays for ${nextUser}`,
          amountCents: 10000,
          payerId: u,
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: u,
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: nextUser, amountCents: 10000 }],
        };
      });

      const balances = calculateNetBalances(expenses, [], users);
      users.forEach(u => expect(balances[u].netBalanceCents).toBe(0));

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('10-Node Cycle (U0 -> U1 -> ... -> U9 -> U0) cancels to 0 transfers', () => {
      const N = 10;
      const users = Array.from({ length: N }, (_, i) => `user_${i}`);
      const expenses: Expense[] = users.map((u, i) => {
        const nextUser = users[(i + 1) % N];
        return {
          id: `exp_${i}`,
          sortieId: 's_cycle10',
          title: `Chain ${i}`,
          amountCents: 2500,
          payerId: u,
          splitType: 'exact',
          category: 'transport',
          date: '2026-08-17',
          createdBy: u,
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: nextUser, amountCents: 2500 }],
        };
      });

      const balances = calculateNetBalances(expenses, [], users);
      users.forEach(u => expect(balances[u].netBalanceCents).toBe(0));

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('50-Node Large Cycle (U0 -> U1 -> ... -> U49 -> U0) cancels to 0 transfers', () => {
      const N = 50;
      const users = Array.from({ length: N }, (_, i) => `node_${i}`);
      const expenses: Expense[] = users.map((u, i) => {
        const nextUser = users[(i + 1) % N];
        return {
          id: `exp_node_${i}`,
          sortieId: 's_cycle50',
          title: `Chain node ${i}`,
          amountCents: 4217,
          payerId: u,
          splitType: 'exact',
          category: 'logement',
          date: '2026-08-17',
          createdBy: u,
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: nextUser, amountCents: 4217 }],
        };
      });

      const balances = calculateNetBalances(expenses, [], users);
      users.forEach(u => expect(balances[u].netBalanceCents).toBe(0));

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });

    test('Perturbed 3-Node Cycle (A->B: 50€, B->C: 30€, C->A: 10€) simplifies to 2 direct transfers', () => {
      const expenses: Expense[] = [
        {
          id: 'e1',
          sortieId: 's1',
          title: 'A pays 50 for B',
          amountCents: 5000,
          payerId: 'user_A',
          splitType: 'exact',
          category: 'courses',
          date: '2026-08-17',
          createdBy: 'user_A',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'user_B', amountCents: 5000 }],
        },
        {
          id: 'e2',
          sortieId: 's1',
          title: 'B pays 30 for C',
          amountCents: 3000,
          payerId: 'user_B',
          splitType: 'exact',
          category: 'bar',
          date: '2026-08-17',
          createdBy: 'user_B',
          createdAt: '2026-08-17T11:00:00Z',
          splits: [{ userId: 'user_C', amountCents: 3000 }],
        },
        {
          id: 'e3',
          sortieId: 's1',
          title: 'C pays 10 for A',
          amountCents: 1000,
          payerId: 'user_C',
          splitType: 'exact',
          category: 'restaurant',
          date: '2026-08-17',
          createdBy: 'user_C',
          createdAt: '2026-08-17T12:00:00Z',
          splits: [{ userId: 'user_A', amountCents: 1000 }],
        },
      ];

      const balances = calculateNetBalances(expenses, [], ['user_A', 'user_B', 'user_C']);
      // A: paid 50, owes 10 -> net = +40€ (+4000)
      // B: paid 30, owes 50 -> net = -20€ (-2000)
      // C: paid 10, owes 30 -> net = -20€ (-2000)
      expect(balances['user_A'].netBalanceCents).toBe(4000);
      expect(balances['user_B'].netBalanceCents).toBe(-2000);
      expect(balances['user_C'].netBalanceCents).toBe(-2000);

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(2);
      expect(transfers).toEqual([
        { fromUserId: 'user_B', toUserId: 'user_A', amountCents: 2000 },
        { fromUserId: 'user_C', toUserId: 'user_A', amountCents: 2000 },
      ]);
      verifyDebtResolution(balances, transfers);
    });

    test('Figure-8 Overlapping Cycles (Cycle 1: A-B-C-A 100€, Cycle 2: C-D-E-C 200€) cancel to 0 transfers', () => {
      const expenses: Expense[] = [
        // Cycle 1
        {
          id: 'c1_1',
          sortieId: 's1',
          title: 'A->B',
          amountCents: 10000,
          payerId: 'A',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'A',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'B', amountCents: 10000 }],
        },
        {
          id: 'c1_2',
          sortieId: 's1',
          title: 'B->C',
          amountCents: 10000,
          payerId: 'B',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'B',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'C', amountCents: 10000 }],
        },
        {
          id: 'c1_3',
          sortieId: 's1',
          title: 'C->A',
          amountCents: 10000,
          payerId: 'C',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'C',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'A', amountCents: 10000 }],
        },
        // Cycle 2
        {
          id: 'c2_1',
          sortieId: 's1',
          title: 'C->D',
          amountCents: 20000,
          payerId: 'C',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'C',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'D', amountCents: 20000 }],
        },
        {
          id: 'c2_2',
          sortieId: 's1',
          title: 'D->E',
          amountCents: 20000,
          payerId: 'D',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'D',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'E', amountCents: 20000 }],
        },
        {
          id: 'c2_3',
          sortieId: 's1',
          title: 'E->C',
          amountCents: 20000,
          payerId: 'E',
          splitType: 'exact',
          category: 'autre',
          date: '2026-08-17',
          createdBy: 'E',
          createdAt: '2026-08-17T10:00:00Z',
          splits: [{ userId: 'C', amountCents: 20000 }],
        },
      ];

      const balances = calculateNetBalances(expenses, [], ['A', 'B', 'C', 'D', 'E']);
      ['A', 'B', 'C', 'D', 'E'].forEach(u => expect(balances[u].netBalanceCents).toBe(0));

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(0);
    });
  });

  // =========================================================================
  // 2. Multi-Payer Asymmetrical Graphs & Dense Bipartite Networks
  // =========================================================================
  describe('2. Multi-Payer Asymmetrical Graphs & Dense Bipartite Networks', () => {
    test('3 Payers paying unequal amounts for 6 members with equal split', () => {
      // Total 600€ (60000 cents), 6 members (A, B, C, D, E, F) -> 100€ each
      // Payers: A pays 100€, B pays 200€, C pays 300€
      const expense: Expense = {
        id: 'multi_exp_1',
        sortieId: 's1',
        title: 'Cottage rent multi-payer',
        amountCents: 60000,
        payerId: 'A',
        payers: [
          { userId: 'A', amountCents: 10000 },
          { userId: 'B', amountCents: 20000 },
          { userId: 'C', amountCents: 30000 },
        ],
        splitType: 'equal',
        category: 'logement',
        date: '2026-08-17',
        createdBy: 'A',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [
          { userId: 'A', amountCents: 10000 },
          { userId: 'B', amountCents: 10000 },
          { userId: 'C', amountCents: 10000 },
          { userId: 'D', amountCents: 10000 },
          { userId: 'E', amountCents: 10000 },
          { userId: 'F', amountCents: 10000 },
        ],
      };

      const balances = calculateNetBalances([expense], [], ['A', 'B', 'C', 'D', 'E', 'F']);
      expect(balances['A'].netBalanceCents).toBe(0); // paid 100, owes 100
      expect(balances['B'].netBalanceCents).toBe(10000); // paid 200, owes 100 -> +100
      expect(balances['C'].netBalanceCents).toBe(20000); // paid 300, owes 100 -> +200
      expect(balances['D'].netBalanceCents).toBe(-10000); // owes 100
      expect(balances['E'].netBalanceCents).toBe(-10000); // owes 100
      expect(balances['F'].netBalanceCents).toBe(-10000); // owes 100

      const transfers = simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(5); // <= N - 1
      expect(transfers).toHaveLength(3); // D, E, F pay B and C
      verifyDebtResolution(balances, transfers);
    });

    test('Complete Bipartite Graph K_{5,5} (5 pure payers, 5 pure consumers)', () => {
      // 5 payers each pay 200.00€ (total 1000.00€)
      // 5 consumers each owe 200.00€
      const payers = ['P1', 'P2', 'P3', 'P4', 'P5'];
      const consumers = ['C1', 'C2', 'C3', 'C4', 'C5'];
      const allUsers = [...payers, ...consumers];

      const expense: Expense = {
        id: 'k55_exp',
        sortieId: 's1',
        title: 'Bipartite feast',
        amountCents: 100000,
        payerId: 'P1',
        payers: payers.map(p => ({ userId: p, amountCents: 20000 })),
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'P1',
        createdAt: '2026-08-17T10:00:00Z',
        splits: consumers.map(c => ({ userId: c, amountCents: 20000 })),
      };

      const balances = calculateNetBalances([expense], [], allUsers);
      payers.forEach(p => expect(balances[p].netBalanceCents).toBe(20000));
      consumers.forEach(c => expect(balances[c].netBalanceCents).toBe(-20000));

      const transfers = simplifyDebts(balances);
      // In a symmetric 5-to-5 pairing with equal debts, exactly 5 transfers are needed
      expect(transfers).toHaveLength(5);
      expect(transfers.length).toBeLessThanOrEqual(allUsers.length - 1); // 5 <= 9
      verifyDebtResolution(balances, transfers);
    });

    test('Multi-Payer with Prime Shares and Percentage Split combination', () => {
      // Expense 1: Multi-payer with shares split (2:3:5 parts)
      const splits1 = calculateSharesSplit(30000, [
        { userId: 'u1', shares: 2 },
        { userId: 'u2', shares: 3 },
        { userId: 'u3', shares: 5 },
      ]);
      const exp1: Expense = {
        id: 'e_shares',
        sortieId: 's1',
        title: 'Shares expense',
        amountCents: 30000,
        payerId: 'u1',
        payers: [
          { userId: 'u1', amountCents: 15000 },
          { userId: 'u2', amountCents: 15000 },
        ],
        splitType: 'shares',
        category: 'activite',
        date: '2026-08-17',
        createdBy: 'u1',
        createdAt: '2026-08-17T10:00:00Z',
        splits: Array.from(splits1.entries()).map(([userId, amountCents]) => ({ userId, amountCents })),
      };

      // Expense 2: Single payer with percentages (33.33%, 33.33%, 33.34%)
      const splits2 = calculatePercentageSplit(10000, [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ]);
      const exp2: Expense = {
        id: 'e_pct',
        sortieId: 's1',
        title: 'Pct expense',
        amountCents: 10000,
        payerId: 'u3',
        splitType: 'percentage',
        category: 'bar',
        date: '2026-08-17',
        createdBy: 'u3',
        createdAt: '2026-08-17T12:00:00Z',
        splits: Array.from(splits2.entries()).map(([userId, amountCents]) => ({ userId, amountCents })),
      };

      const balances = calculateNetBalances([exp1, exp2], [], ['u1', 'u2', 'u3']);
      const totalSum = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(totalSum).toBe(0);

      const transfers = simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(2);
      verifyDebtResolution(balances, transfers);
    });
  });

  // =========================================================================
  // 3. Max Transfers Bound (<= N - 1 and <= |D| + |C| - 1)
  // =========================================================================
  describe('3. Max Transfers Constraint Verification', () => {
    test('Star Graph (1 Creditor, 15 Debtors) generates exactly 15 transfers (<= 15)', () => {
      const creditor = 'boss';
      const debtors = Array.from({ length: 15 }, (_, i) => `worker_${i}`);
      const all = [creditor, ...debtors];

      const balances: Record<string, UserNetBalance> = {
        [creditor]: { userId: creditor, totalPaidCents: 15000, totalOwedCents: 0, netBalanceCents: 15000 },
      };
      debtors.forEach(d => {
        balances[d] = { userId: d, totalPaidCents: 0, totalOwedCents: 1000, netBalanceCents: -1000 };
      });

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(15);
      expect(transfers.length).toBeLessThanOrEqual(all.length - 1);
      expect(transfers.every(t => t.toUserId === creditor)).toBe(true);
      verifyDebtResolution(balances, transfers);
    });

    test('Star Graph (1 Debtor, 15 Creditors) generates exactly 15 transfers (<= 15)', () => {
      const debtor = 'spender';
      const creditors = Array.from({ length: 15 }, (_, i) => `creditor_${i}`);
      const all = [debtor, ...creditors];

      const balances: Record<string, UserNetBalance> = {
        [debtor]: { userId: debtor, totalPaidCents: 0, totalOwedCents: 15000, netBalanceCents: -15000 },
      };
      creditors.forEach(c => {
        balances[c] = { userId: c, totalPaidCents: 1000, totalOwedCents: 0, netBalanceCents: 1000 };
      });

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(15);
      expect(transfers.length).toBeLessThanOrEqual(all.length - 1);
      expect(transfers.every(t => t.fromUserId === debtor)).toBe(true);
      verifyDebtResolution(balances, transfers);
    });

    test('General Graph of 30 nodes with arbitrary balances never exceeds N - 1 transfers', () => {
      const N = 30;
      const users = Array.from({ length: N }, (_, i) => `usr_${i}`);
      const balances: Record<string, UserNetBalance> = {};

      // Seed 10 creditors, 15 debtors, 5 neutral
      let totalSurplus = 0;
      for (let i = 0; i < 10; i++) {
        const val = (i + 1) * 1370;
        totalSurplus += val;
        balances[users[i]] = { userId: users[i], totalPaidCents: val, totalOwedCents: 0, netBalanceCents: val };
      }

      // Distribute totalSurplus across 15 debtors
      const baseDebt = Math.floor(totalSurplus / 15);
      let rem = totalSurplus % 15;
      for (let i = 10; i < 25; i++) {
        const val = baseDebt + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        balances[users[i]] = { userId: users[i], totalPaidCents: 0, totalOwedCents: val, netBalanceCents: -val };
      }

      // 5 neutral
      for (let i = 25; i < 30; i++) {
        balances[users[i]] = { userId: users[i], totalPaidCents: 500, totalOwedCents: 500, netBalanceCents: 0 };
      }

      const transfers = simplifyDebts(balances);
      // Maximum transfers for 10 creditors and 15 debtors is at most 10 + 15 - 1 = 24 <= 29
      expect(transfers.length).toBeLessThanOrEqual(24);
      expect(transfers.length).toBeLessThanOrEqual(N - 1);
      verifyDebtResolution(balances, transfers);
    });
  });

  // =========================================================================
  // 4. Partial and Over-Settlement Scenarios
  // =========================================================================
  describe('4. Partial and Over-Settlement Sequences', () => {
    test('Series of incremental settlements progressively reduces required transfers', () => {
      // Initial state: Alice paid 100.00€ for Bob
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Concert tickets',
        amountCents: 10000,
        payerId: 'alice',
        splitType: 'exact',
        category: 'activite',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [{ userId: 'bob', amountCents: 10000 }],
      };

      // Step 0: No settlement -> Bob owes 100€ to Alice
      const b0 = calculateNetBalances([expense], [], ['alice', 'bob']);
      const t0 = simplifyDebts(b0);
      expect(t0).toEqual([{ fromUserId: 'bob', toUserId: 'alice', amountCents: 10000 }]);

      // Step 1: Bob pays 30€
      const s1: Settlement = {
        id: 's1',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 3000,
        date: '2026-08-17',
        createdAt: '2026-08-17T11:00:00Z',
      };
      const b1 = calculateNetBalances([expense], [s1], ['alice', 'bob']);
      const t1 = simplifyDebts(b1);
      expect(t1).toEqual([{ fromUserId: 'bob', toUserId: 'alice', amountCents: 7000 }]);

      // Step 2: Bob pays another 40€
      const s2: Settlement = {
        id: 's2',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 4000,
        date: '2026-08-17',
        createdAt: '2026-08-17T12:00:00Z',
      };
      const b2 = calculateNetBalances([expense], [s1, s2], ['alice', 'bob']);
      const t2 = simplifyDebts(b2);
      expect(t2).toEqual([{ fromUserId: 'bob', toUserId: 'alice', amountCents: 3000 }]);

      // Step 3: Bob pays final 30€ -> completely settled
      const s3: Settlement = {
        id: 's3',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 3000,
        date: '2026-08-17',
        createdAt: '2026-08-17T13:00:00Z',
      };
      const b3 = calculateNetBalances([expense], [s1, s2, s3], ['alice', 'bob']);
      const t3 = simplifyDebts(b3);
      expect(t3).toHaveLength(0);
    });

    test('Over-settlement flips roles correctly (debtor becomes creditor)', () => {
      // Alice pays 50€ for Bob
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Lunch',
        amountCents: 5000,
        payerId: 'alice',
        splitType: 'exact',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [{ userId: 'bob', amountCents: 5000 }],
      };

      // Bob mistakenly transfers 70€ to Alice (overpays by 20€)
      const settlement: Settlement = {
        id: 's_over',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 7000,
        date: '2026-08-17',
        createdAt: '2026-08-17T11:00:00Z',
      };

      const balances = calculateNetBalances([expense], [settlement], ['alice', 'bob']);
      // Alice: paid 5000, owed 7000 -> net = -2000 (-20€)
      // Bob: paid 7000, owed 5000 -> net = +2000 (+20€)
      expect(balances['alice'].netBalanceCents).toBe(-2000);
      expect(balances['bob'].netBalanceCents).toBe(2000);

      const transfers = simplifyDebts(balances);
      expect(transfers).toEqual([{ fromUserId: 'alice', toUserId: 'bob', amountCents: 2000 }]);
      verifyDebtResolution(balances, transfers);
    });

    test('Third-party settlement (Charlie settles on behalf of Bob to Alice)', () => {
      // Alice pays 60€ for Bob
      const expense: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Dinner',
        amountCents: 6000,
        payerId: 'alice',
        splitType: 'exact',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T10:00:00Z',
        splits: [{ userId: 'bob', amountCents: 6000 }],
      };

      // Charlie pays Alice 60€ directly
      const settlement: Settlement = {
        id: 's_tri',
        sortieId: 's1',
        payerId: 'charlie',
        recipientId: 'alice',
        amountCents: 6000,
        date: '2026-08-17',
        createdAt: '2026-08-17T11:00:00Z',
      };

      const balances = calculateNetBalances([expense], [settlement], ['alice', 'bob', 'charlie']);
      // Alice: paid 6000, received 6000 -> net = 0
      // Bob: owes 6000 -> net = -6000
      // Charlie: paid 6000 -> net = +6000
      expect(balances['alice'].netBalanceCents).toBe(0);
      expect(balances['bob'].netBalanceCents).toBe(-6000);
      expect(balances['charlie'].netBalanceCents).toBe(6000);

      const transfers = simplifyDebts(balances);
      expect(transfers).toEqual([{ fromUserId: 'bob', toUserId: 'charlie', amountCents: 6000 }]);
      verifyDebtResolution(balances, transfers);
    });
  });

  // =========================================================================
  // 5. Disconnected Subgraphs and Independent Debt Clusters
  // =========================================================================
  describe('5. Disconnected Subgraphs and Isolated Clusters', () => {
    test('Two separate disconnected groups in one sortie resolve cleanly without leakage', () => {
      // Group 1: A paid 40€ for B (A: +40€, B: -40€)
      // Group 2: C paid 70€ for D (C: +70€, D: -70€)
      const balances: Record<string, UserNetBalance> = {
        A: { userId: 'A', totalPaidCents: 4000, totalOwedCents: 0, netBalanceCents: 4000 },
        B: { userId: 'B', totalPaidCents: 0, totalOwedCents: 4000, netBalanceCents: -4000 },
        C: { userId: 'C', totalPaidCents: 7000, totalOwedCents: 0, netBalanceCents: 7000 },
        D: { userId: 'D', totalPaidCents: 0, totalOwedCents: 7000, netBalanceCents: -7000 },
      };

      const transfers = simplifyDebts(balances);
      // Greedy pairs largest debtor (-70€, D) with largest creditor (+70€, C) -> D to C (70€)
      // Then next debtor (-40€, B) with next creditor (+40€, A) -> B to A (40€)
      expect(transfers).toHaveLength(2);
      expect(transfers).toEqual([
        { fromUserId: 'D', toUserId: 'C', amountCents: 7000 },
        { fromUserId: 'B', toUserId: 'A', amountCents: 4000 },
      ]);
      verifyDebtResolution(balances, transfers);
    });

    test('Multiple disjoint balanced clusters resolve with zero net error', () => {
      // Cluster 1 (sum=0): u1 (+10€), u2 (-10€)
      // Cluster 2 (sum=0): u3 (+25€), u4 (-25€)
      // Cluster 3 (sum=0): u5 (+50€), u6 (+30€), u7 (-80€)
      const balances: Record<string, UserNetBalance> = {
        u1: { userId: 'u1', totalPaidCents: 1000, totalOwedCents: 0, netBalanceCents: 1000 },
        u2: { userId: 'u2', totalPaidCents: 0, totalOwedCents: 1000, netBalanceCents: -1000 },
        u3: { userId: 'u3', totalPaidCents: 2500, totalOwedCents: 0, netBalanceCents: 2500 },
        u4: { userId: 'u4', totalPaidCents: 0, totalOwedCents: 2500, netBalanceCents: -2500 },
        u5: { userId: 'u5', totalPaidCents: 5000, totalOwedCents: 0, netBalanceCents: 5000 },
        u6: { userId: 'u6', totalPaidCents: 3000, totalOwedCents: 0, netBalanceCents: 3000 },
        u7: { userId: 'u7', totalPaidCents: 0, totalOwedCents: 8000, netBalanceCents: -8000 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers.length).toBeLessThanOrEqual(6);
      verifyDebtResolution(balances, transfers);
    });
  });

  // =========================================================================
  // 6. Property-Based Randomized Fuzzing Stress Harness
  // =========================================================================
  describe('6. Property-Based Randomized Fuzzing Harness (100 Worlds, 5000+ Transactions)', () => {
    test('100 randomized multi-participant worlds satisfy all conservation and bound invariants', () => {
      // Simple deterministic LCG random generator for reproducible test runs
      let seed = 42891;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };
      const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

      for (let world = 0; world < 100; world++) {
        const numParticipants = randInt(3, 20);
        const participantIds = Array.from({ length: numParticipants }, (_, i) => `user_w${world}_p${i}`);
        const numExpenses = randInt(5, 25);
        const numSettlements = randInt(0, 5);

        const expenses: Expense[] = [];
        for (let e = 0; e < numExpenses; e++) {
          const totalCents = randInt(100, 50000); // 1.00€ to 500.00€
          const splitTypeRoll = randInt(1, 4);

          // Payer strategy: 80% single payer, 20% multi-payer
          const isMultiPayer = rand() < 0.2;
          let payers: { userId: string; amountCents: number }[] | undefined;
          let payerId = participantIds[randInt(0, numParticipants - 1)];

          if (isMultiPayer) {
            const numPayers = randInt(2, Math.min(4, numParticipants));
            const selectedPayers = [...participantIds].sort(() => rand() - 0.5).slice(0, numPayers);
            const payerSplit = calculateEqualSplit(totalCents, selectedPayers);
            payers = Array.from(payerSplit.entries()).map(([u, a]) => ({ userId: u, amountCents: a }));
            payerId = selectedPayers[0];
          }

          // Beneficiaries: random subset of 2 to all participants
          const numBeneficiaries = randInt(2, numParticipants);
          const beneficiaries = [...participantIds].sort(() => rand() - 0.5).slice(0, numBeneficiaries);

          let splits: { userId: string; amountCents: number }[] = [];
          if (splitTypeRoll === 1) {
            // Equal
            const splitMap = calculateEqualSplit(totalCents, beneficiaries);
            splits = Array.from(splitMap.entries()).map(([u, a]) => ({ userId: u, amountCents: a }));
          } else if (splitTypeRoll === 2) {
            // Exact
            const splitMap = calculateEqualSplit(totalCents, beneficiaries);
            splits = Array.from(splitMap.entries()).map(([u, a]) => ({ userId: u, amountCents: a }));
          } else if (splitTypeRoll === 3) {
            // Percentage
            const pcts = beneficiaries.map((u, idx) => ({
              userId: u,
              percentage: idx === beneficiaries.length - 1
                ? 100 - (beneficiaries.length - 1) * Math.floor(100 / beneficiaries.length)
                : Math.floor(100 / beneficiaries.length),
            }));
            const splitMap = calculatePercentageSplit(totalCents, pcts);
            splits = Array.from(splitMap.entries()).map(([u, a]) => ({ userId: u, amountCents: a }));
          } else {
            // Shares
            const sharesList = beneficiaries.map(u => ({ userId: u, shares: randInt(1, 5) }));
            const splitMap = calculateSharesSplit(totalCents, sharesList);
            splits = Array.from(splitMap.entries()).map(([u, a]) => ({ userId: u, amountCents: a }));
          }

          expenses.push({
            id: `exp_w${world}_${e}`,
            sortieId: `s_w${world}`,
            title: `Random Expense ${e}`,
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

        const settlements: Settlement[] = [];
        for (let s = 0; s < numSettlements; s++) {
          const payerIdx = randInt(0, numParticipants - 1);
          let recipientIdx = randInt(0, numParticipants - 1);
          if (recipientIdx === payerIdx) recipientIdx = (payerIdx + 1) % numParticipants;

          settlements.push({
            id: `set_w${world}_${s}`,
            sortieId: `s_w${world}`,
            payerId: participantIds[payerIdx],
            recipientId: participantIds[recipientIdx],
            amountCents: randInt(50, 5000),
            date: '2026-08-17',
            createdAt: '2026-08-17T12:00:00Z',
          });
        }

        // Calculate Net Balances
        const balances = calculateNetBalances(expenses, settlements, participantIds);

        // Invariant 1: Sum of all net balances in every world must be strictly 0
        const worldNetSum = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
        expect(worldNetSum).toBe(0);

        // Simplify Debts
        const transfers = simplifyDebts(balances);

        // Invariant 2: Transfers count <= N - 1
        expect(transfers.length).toBeLessThanOrEqual(numParticipants - 1);

        // Invariant 3: Verify full resolution
        verifyDebtResolution(balances, transfers);

        // Invariant 4: Determinism (calling twice on same data produces exact same transfer array)
        const transfersRepeat = simplifyDebts(balances);
        expect(transfersRepeat).toEqual(transfers);
      }
    });
  });

  // =========================================================================
  // 7. Large Scale & Extreme Boundaries
  // =========================================================================
  describe('7. Scale (N=500) and Large Integer Boundaries', () => {
    test('Handles large group (N=500 participants) in under 100ms with <= N-1 transfers', () => {
      const N = 500;
      const users = Array.from({ length: N }, (_, i) => `large_user_${i}`);
      const balances: Record<string, UserNetBalance> = {};

      let totalPool = 0;
      // 200 Creditors (+100€ to +20,000€)
      for (let i = 0; i < 200; i++) {
        const amt = (i + 1) * 10000;
        totalPool += amt;
        balances[users[i]] = { userId: users[i], totalPaidCents: amt, totalOwedCents: 0, netBalanceCents: amt };
      }

      // 250 Debtors
      const baseDebtor = Math.floor(totalPool / 250);
      let remainder = totalPool % 250;
      for (let i = 200; i < 450; i++) {
        const amt = baseDebtor + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
        balances[users[i]] = { userId: users[i], totalPaidCents: 0, totalOwedCents: amt, netBalanceCents: -amt };
      }

      // 50 Neutral participants
      for (let i = 450; i < 500; i++) {
        balances[users[i]] = { userId: users[i], totalPaidCents: 0, totalOwedCents: 0, netBalanceCents: 0 };
      }

      const start = performance.now();
      const transfers = simplifyDebts(balances);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Must be fast (<100ms)
      expect(transfers.length).toBeLessThanOrEqual(N - 1);
      expect(transfers.length).toBeLessThanOrEqual(200 + 250 - 1); // <= 449
      verifyDebtResolution(balances, transfers);
    });

    test('Handles huge transaction values (1,000,000,000 cents = 10M €) without overflow', () => {
      const hugeAmount = 1_000_000_000; // 1 billion cents = 10,000,000.00 €
      const balances: Record<string, UserNetBalance> = {
        mega_creditor: { userId: 'mega_creditor', totalPaidCents: hugeAmount, totalOwedCents: 0, netBalanceCents: hugeAmount },
        mega_debtor_1: { userId: 'mega_debtor_1', totalPaidCents: 0, totalOwedCents: 400_000_000, netBalanceCents: -400_000_000 },
        mega_debtor_2: { userId: 'mega_debtor_2', totalPaidCents: 0, totalOwedCents: 600_000_000, netBalanceCents: -600_000_000 },
      };

      const transfers = simplifyDebts(balances);
      expect(transfers).toHaveLength(2);
      expect(transfers).toEqual([
        { fromUserId: 'mega_debtor_2', toUserId: 'mega_creditor', amountCents: 600_000_000 },
        { fromUserId: 'mega_debtor_1', toUserId: 'mega_creditor', amountCents: 400_000_000 },
      ]);
      verifyDebtResolution(balances, transfers);
    });

    test('Defensive check on empty balance inputs or null/undefined', () => {
      expect(simplifyDebts({})).toEqual([]);
      expect(simplifyDebts([])).toEqual([]);
      expect(simplifyDebts(new Map())).toEqual([]);
      // @ts-expect-error test non-standard input
      expect(simplifyDebts(null)).toEqual([]);
      // @ts-expect-error test non-standard input
      expect(simplifyDebts(undefined)).toEqual([]);
    });

    test('Single participant with 0 balance produces 0 transfers', () => {
      const balances: Record<string, UserNetBalance> = {
        solo: { userId: 'solo', totalPaidCents: 5000, totalOwedCents: 5000, netBalanceCents: 0 },
      };
      expect(simplifyDebts(balances)).toEqual([]);
    });
  });
});
