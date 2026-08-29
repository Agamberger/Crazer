/**
 * Test de validation empirique adversarial (Challenger 2) pour le Milestone 3.
 * Vérifie l'intégration Zustand Store <-> Moteur Mathématique,
 * l'exactitude absolue des calculs sur des graphes de dettes complexes,
 * le comportement dynamique lors d'ajouts/suppressions de règlements et les cas limites.
 */

import { useFinancesStore } from '../store/useFinancesStore';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
} from '../utils/financialMath';
import { Expense, Settlement, CreateExpenseInput, CreateSettlementInput } from '../types';

// Mock du service pour contrôler les retours dans les actions asynchrones du store
jest.mock('../services/financesService', () => ({
  financesService: {
    fetchExpenses: jest.fn(),
    fetchExpenseById: jest.fn(),
    fetchSettlements: jest.fn(),
    createExpense: jest.fn(async (input: CreateExpenseInput) => ({
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      ...input,
    })),
    updateExpense: jest.fn(async (id: string, updates: Partial<Expense>) => ({
      id,
      createdAt: new Date().toISOString(),
      ...updates,
    })),
    deleteExpense: jest.fn(async () => undefined),
    createSettlement: jest.fn(async (input: CreateSettlementInput) => ({
      id: `set-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      ...input,
    })),
    deleteSettlement: jest.fn(async () => undefined),
  },
}));

describe('Empirical Challenger 2 — Milestone 3 Store & Math Integration Stress Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFinancesStore.getState().reset();
  });

  describe('1. Empirical Verification: Store Getters & Math Invariants on Complex Graphs', () => {
    test('Simulates 50 randomized complex financial graphs with 5-25 participants and mixed split modes', () => {
      for (let run = 0; run < 50; run++) {
        const numUsers = 5 + Math.floor(Math.random() * 20); // 5 to 24 users
        const users = Array.from({ length: numUsers }, (_, i) => `user_${run}_${i + 1}`);
        const expenses: Expense[] = [];
        const numExpenses = 10 + Math.floor(Math.random() * 20);

        let totalExpectedExpenses = 0;

        for (let e = 0; e < numExpenses; e++) {
          const totalCents = 100 + Math.floor(Math.random() * 50000); // 1.00€ to 500.00€
          totalExpectedExpenses += totalCents;

          // Pick random subset of beneficiaries (at least 2)
          const shuffled = [...users].sort(() => 0.5 - Math.random());
          const beneficiaryCount = 2 + Math.floor(Math.random() * (users.length - 1));
          const beneficiaries = shuffled.slice(0, beneficiaryCount);

          const splitTypeRoll = Math.random();
          let splitType: Expense['splitType'] = 'equal';
          let splits: Expense['splits'] = [];

          if (splitTypeRoll < 0.25) {
            // Equal split
            splitType = 'equal';
            const splitMap = calculateEqualSplit(totalCents, beneficiaries);
            splits = beneficiaries.map((id) => ({
              userId: id,
              amountCents: splitMap.get(id) || 0,
            }));
          } else if (splitTypeRoll < 0.5) {
            // Percentage split
            splitType = 'percentage';
            // Generate percentages that sum to 100
            const rawWeights = beneficiaries.map(() => Math.random() + 0.1);
            const sumWeights = rawWeights.reduce((a, b) => a + b, 0);
            const percentages = beneficiaries.map((id, idx) => ({
              userId: id,
              percentage: (rawWeights[idx] / sumWeights) * 100,
            }));
            const splitMap = calculatePercentageSplit(totalCents, percentages);
            splits = percentages.map((p) => ({
              userId: p.userId,
              percentage: p.percentage,
              amountCents: splitMap.get(p.userId) || 0,
            }));
          } else if (splitTypeRoll < 0.75) {
            // Shares split
            splitType = 'shares';
            const sharesList = beneficiaries.map((id) => ({
              userId: id,
              shares: 1 + Math.floor(Math.random() * 5),
            }));
            const splitMap = calculateSharesSplit(totalCents, sharesList);
            splits = sharesList.map((s) => ({
              userId: s.userId,
              shares: s.shares,
              amountCents: splitMap.get(s.userId) || 0,
            }));
          } else {
            // Exact split
            splitType = 'exact';
            // Generate partitions
            const cuts = [0, totalCents];
            for (let c = 0; c < beneficiaries.length - 1; c++) {
              cuts.push(Math.floor(Math.random() * totalCents));
            }
            cuts.sort((a, b) => a - b);
            const allocations = beneficiaries.map((id, idx) => ({
              userId: id,
              amountCents: cuts[idx + 1] - cuts[idx],
            }));
            const splitMap = calculateExactSplit(totalCents, allocations);
            splits = allocations.map((a) => ({
              userId: a.userId,
              amountCents: splitMap.get(a.userId) || 0,
            }));
          }

          // Verify sum of splits invariant
          const splitSum = splits.reduce((s, item) => s + item.amountCents, 0);
          expect(splitSum).toBe(totalCents);

          // Multi-payer vs Single-payer
          const isMultiPayer = Math.random() > 0.5;
          if (isMultiPayer) {
            const payerCount = 2 + Math.floor(Math.random() * Math.min(4, users.length - 1));
            const payerSub = [...users].sort(() => 0.5 - Math.random()).slice(0, payerCount);
            const payerCuts = [0, totalCents];
            for (let c = 0; c < payerSub.length - 1; c++) {
              payerCuts.push(Math.floor(Math.random() * totalCents));
            }
            payerCuts.sort((a, b) => a - b);
            const payers = payerSub.map((id, idx) => ({
              userId: id,
              amountCents: payerCuts[idx + 1] - payerCuts[idx],
            }));

            expenses.push({
              id: `exp-${run}-${e}`,
              sortieId: `sortie-${run}`,
              title: `Expense ${e}`,
              amountCents: totalCents,
              payerId: payers[0].userId,
              payers,
              splitType,
              category: 'restaurant',
              date: '2026-08-17T12:00:00Z',
              createdBy: payers[0].userId,
              createdAt: '2026-08-17T12:00:00Z',
              splits,
            });
          } else {
            const singlePayer = users[Math.floor(Math.random() * users.length)];
            expenses.push({
              id: `exp-${run}-${e}`,
              sortieId: `sortie-${run}`,
              title: `Expense ${e}`,
              amountCents: totalCents,
              payerId: singlePayer,
              splitType,
              category: 'activite',
              date: '2026-08-17T12:00:00Z',
              createdBy: singlePayer,
              createdAt: '2026-08-17T12:00:00Z',
              splits,
            });
          }
        }

        // Hydrate store state
        useFinancesStore.setState({
          expenses,
          settlements: [],
          activeSortieId: `sortie-${run}`,
        });

        // 1. Verify getTotalExpensesCents()
        expect(useFinancesStore.getState().getTotalExpensesCents()).toBe(totalExpectedExpenses);

        // 2. Verify getNetBalances()
        const balances = useFinancesStore.getState().getNetBalances(users);
        let sumNetBalances = 0;

        for (const u of users) {
          const b = balances[u];
          expect(b).toBeDefined();
          expect(b.netBalanceCents).toBe(b.totalPaidCents - b.totalOwedCents);
          expect(useFinancesStore.getState().getUserBalanceCents(u)).toBe(b.netBalanceCents);
          sumNetBalances += b.netBalanceCents;
        }

        // Invariant: sum of all net balances must be EXACTLY 0 cents
        expect(sumNetBalances).toBe(0);

        // 3. Verify getSuggestedTransfers()
        const transfers = useFinancesStore.getState().getSuggestedTransfers(users);
        const nonZeroUsers = users.filter((u) => balances[u].netBalanceCents !== 0);

        if (nonZeroUsers.length > 0) {
          expect(transfers.length).toBeLessThanOrEqual(nonZeroUsers.length - 1);
        } else {
          expect(transfers.length).toBe(0);
        }

        // Apply all transfers virtually to ensure full debt clearance
        const virtualBalances: Record<string, number> = {};
        users.forEach((u) => {
          virtualBalances[u] = balances[u].netBalanceCents;
        });

        for (const t of transfers) {
          expect(t.amountCents).toBeGreaterThan(0);
          expect(t.fromUserId).not.toBe(t.toUserId);
          virtualBalances[t.fromUserId] += t.amountCents; // debtor pays
          virtualBalances[t.toUserId] -= t.amountCents; // creditor receives
        }

        for (const u of users) {
          expect(virtualBalances[u]).toBe(0);
        }
      }
    });
  });

  describe('2. Dynamic Settlement Lifecycles & Residual Debt Elimination', () => {
    test('Adding suggested settlements step-by-step progressively reduces transfers until 0 residual debt', async () => {
      // Setup a 4-person debt network
      // Alice pays 100€ split [Alice: 25, Bob: 25, Charlie: 25, David: 25] -> Alice +75, others -25
      // Bob pays 50€ split [Charlie: 25, David: 25] -> Bob +50 - 25 = +25, Alice +75, Charlie -50, David -50
      const exp1: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Villa',
        amountCents: 10000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'logement',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'alice', amountCents: 2500 },
          { userId: 'bob', amountCents: 2500 },
          { userId: 'charlie', amountCents: 2500 },
          { userId: 'david', amountCents: 2500 },
        ],
      };

      const exp2: Expense = {
        id: 'e2',
        sortieId: 's1',
        title: 'Courses',
        amountCents: 5000,
        payerId: 'bob',
        splitType: 'equal',
        category: 'courses',
        date: '2026-08-17',
        createdBy: 'bob',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'charlie', amountCents: 2500 },
          { userId: 'david', amountCents: 2500 },
        ],
      };

      useFinancesStore.setState({
        expenses: [exp1, exp2],
        settlements: [],
        activeSortieId: 's1',
      });

      const initialBalances = useFinancesStore.getState().getNetBalances();
      expect(initialBalances['alice'].netBalanceCents).toBe(7500);
      expect(initialBalances['bob'].netBalanceCents).toBe(2500);
      expect(initialBalances['charlie'].netBalanceCents).toBe(-5000);
      expect(initialBalances['david'].netBalanceCents).toBe(-5000);

      // Step 1: Query suggested transfers
      let transfers = useFinancesStore.getState().getSuggestedTransfers();
      expect(transfers.length).toBeGreaterThan(0);

      // Sequentially execute suggested transfers one by one
      while (transfers.length > 0) {
        const nextTransfer = transfers[0];

        // Execute settlement via store action
        await useFinancesStore.getState().createSettlement({
          sortieId: 's1',
          payerId: nextTransfer.fromUserId,
          recipientId: nextTransfer.toUserId,
          amountCents: nextTransfer.amountCents,
        });

        // Re-query transfers
        transfers = useFinancesStore.getState().getSuggestedTransfers();
      }

      // After settling all suggested transfers, net balances must all be 0
      const finalBalances = useFinancesStore.getState().getNetBalances();
      for (const u of ['alice', 'bob', 'charlie', 'david']) {
        expect(finalBalances[u].netBalanceCents).toBe(0);
        expect(useFinancesStore.getState().getUserBalanceCents(u)).toBe(0);
      }
      expect(useFinancesStore.getState().getSuggestedTransfers()).toHaveLength(0);
    });

    test('Deleting a settlement dynamically restores exact debt with zero residual error', async () => {
      const exp: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Dinner',
        amountCents: 8000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'alice', amountCents: 4000 },
          { userId: 'bob', amountCents: 4000 },
        ],
      };

      const setl: Settlement = {
        id: 'set-del-test',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 2500, // Partial settlement of 25.00€
        date: '2026-08-17',
        createdAt: '2026-08-17',
      };

      useFinancesStore.setState({
        expenses: [exp],
        settlements: [setl],
        activeSortieId: 's1',
      });

      // Prior to deletion: Bob owes 40 - 25 = 15€ (-1500c)
      expect(useFinancesStore.getState().getUserBalanceCents('bob')).toBe(-1500);
      expect(useFinancesStore.getState().getUserBalanceCents('alice')).toBe(1500);

      // Delete settlement
      await useFinancesStore.getState().deleteSettlement('set-del-test');

      // Post deletion: Bob owes 40€ (-4000c), Alice owed 40€ (+4000c)
      expect(useFinancesStore.getState().getUserBalanceCents('bob')).toBe(-4000);
      expect(useFinancesStore.getState().getUserBalanceCents('alice')).toBe(4000);
      expect(useFinancesStore.getState().settlements).toEqual([]);

      const transfers = useFinancesStore.getState().getSuggestedTransfers();
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'bob',
        toUserId: 'alice',
        amountCents: 4000,
      });
    });

    test('Over-settlement dynamically inverts debtor/creditor relationships', async () => {
      const exp: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Taxi',
        amountCents: 2000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'transport',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'alice', amountCents: 1000 },
          { userId: 'bob', amountCents: 1000 },
        ],
      };

      // Bob owes 10€, but accidentally pays 30€ (over-settles by 20€)
      const overSettlement: Settlement = {
        id: 'set-over',
        sortieId: 's1',
        payerId: 'bob',
        recipientId: 'alice',
        amountCents: 3000,
        date: '2026-08-17',
        createdAt: '2026-08-17',
      };

      useFinancesStore.setState({
        expenses: [exp],
        settlements: [overSettlement],
        activeSortieId: 's1',
      });

      // Now Bob is a CREDITOR (+20€) and Alice is a DEBTOR (-20€)
      expect(useFinancesStore.getState().getUserBalanceCents('bob')).toBe(2000);
      expect(useFinancesStore.getState().getUserBalanceCents('alice')).toBe(-2000);

      const transfers = useFinancesStore.getState().getSuggestedTransfers();
      expect(transfers).toHaveLength(1);
      expect(transfers[0]).toEqual({
        fromUserId: 'alice',
        toUserId: 'bob',
        amountCents: 2000,
      });
    });
  });

  describe('3. Edge Cases & Boundary Conditions', () => {
    test('Empty store state produces zero values and empty structures without errors', () => {
      useFinancesStore.setState({ expenses: [], settlements: [] });

      expect(useFinancesStore.getState().getTotalExpensesCents()).toBe(0);
      expect(useFinancesStore.getState().getUserBalanceCents('any-user')).toBe(0);
      expect(useFinancesStore.getState().getNetBalances()).toEqual({});
      expect(useFinancesStore.getState().getSuggestedTransfers()).toEqual([]);
    });

    test('Participant with 0 expenses and 0 settlements when explicitly passed in participantIds', () => {
      const exp: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Drinks',
        amountCents: 2000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'bar',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'alice', amountCents: 1000 },
          { userId: 'bob', amountCents: 1000 },
        ],
      };

      useFinancesStore.setState({ expenses: [exp], settlements: [] });

      const balances = useFinancesStore
        .getState()
        .getNetBalances(['alice', 'bob', 'charlie_spectator']);

      expect(balances['charlie_spectator']).toBeDefined();
      expect(balances['charlie_spectator'].totalPaidCents).toBe(0);
      expect(balances['charlie_spectator'].totalOwedCents).toBe(0);
      expect(balances['charlie_spectator'].netBalanceCents).toBe(0);
    });

    test('Extreme currency scale: 1,000,000.00€ (100,000,000 cents)', () => {
      const hugeAmount = 100000000; // 1M €
      const exp: Expense = {
        id: 'e_huge',
        sortieId: 's_huge',
        title: 'Yacht purchase',
        amountCents: hugeAmount,
        payerId: 'billionaire',
        splitType: 'equal',
        category: 'autre',
        date: '2026-08-17',
        createdBy: 'billionaire',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'billionaire', amountCents: 50000000 },
          { userId: 'friend', amountCents: 50000000 },
        ],
      };

      useFinancesStore.setState({ expenses: [exp], settlements: [] });

      expect(useFinancesStore.getState().getTotalExpensesCents()).toBe(hugeAmount);
      expect(useFinancesStore.getState().getUserBalanceCents('billionaire')).toBe(50000000);
      expect(useFinancesStore.getState().getUserBalanceCents('friend')).toBe(-50000000);

      const transfers = useFinancesStore.getState().getSuggestedTransfers();
      expect(transfers).toHaveLength(1);
      expect(transfers[0].amountCents).toBe(50000000);
    });

    test('Micro amounts: 1 cent split equally among 10 people', () => {
      const beneficiaries = Array.from({ length: 10 }, (_, i) => `user_${i}`);
      const splitMap = calculateEqualSplit(1, beneficiaries);

      const splits = beneficiaries.map((id) => ({
        userId: id,
        amountCents: splitMap.get(id) || 0,
      }));

      const exp: Expense = {
        id: 'e_micro',
        sortieId: 's_micro',
        title: 'Micro fee',
        amountCents: 1,
        payerId: 'user_0',
        splitType: 'equal',
        category: 'autre',
        date: '2026-08-17',
        createdBy: 'user_0',
        createdAt: '2026-08-17',
        splits,
      };

      useFinancesStore.setState({ expenses: [exp], settlements: [] });

      // user_0 paid 1 cent, owes 1 cent -> net 0
      // user_1 to user_9 owe 0 cents -> net 0
      expect(useFinancesStore.getState().getUserBalanceCents('user_0')).toBe(0);
      for (let i = 1; i < 10; i++) {
        expect(useFinancesStore.getState().getUserBalanceCents(`user_${i}`)).toBe(0);
      }
      expect(useFinancesStore.getState().getSuggestedTransfers()).toHaveLength(0);
    });

    test('Disjoint clusters of expenses remain independent in suggested transfers', () => {
      // Cluster 1: Alice and Bob (Alice pays 20€ for both)
      const exp1: Expense = {
        id: 'e1',
        sortieId: 's1',
        title: 'Cluster 1',
        amountCents: 2000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'alice', amountCents: 1000 },
          { userId: 'bob', amountCents: 1000 },
        ],
      };

      // Cluster 2: Charlie and David (Charlie pays 40€ for both)
      const exp2: Expense = {
        id: 'e2',
        sortieId: 's1',
        title: 'Cluster 2',
        amountCents: 4000,
        payerId: 'charlie',
        splitType: 'equal',
        category: 'activite',
        date: '2026-08-17',
        createdBy: 'charlie',
        createdAt: '2026-08-17',
        splits: [
          { userId: 'charlie', amountCents: 2000 },
          { userId: 'david', amountCents: 2000 },
        ],
      };

      useFinancesStore.setState({ expenses: [exp1, exp2], settlements: [] });

      const transfers = useFinancesStore.getState().getSuggestedTransfers();
      expect(transfers).toHaveLength(2);

      const transferFromBob = transfers.find((t) => t.fromUserId === 'bob');
      const transferFromDavid = transfers.find((t) => t.fromUserId === 'david');

      expect(transferFromBob).toBeDefined();
      expect(transferFromBob?.toUserId).toBe('alice');
      expect(transferFromBob?.amountCents).toBe(1000);

      expect(transferFromDavid).toBeDefined();
      expect(transferFromDavid?.toUserId).toBe('charlie');
      expect(transferFromDavid?.amountCents).toBe(2000);
    });
  });
});
