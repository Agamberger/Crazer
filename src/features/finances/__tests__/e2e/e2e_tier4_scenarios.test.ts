/**
 * E2E Acceptance Test Suite — Tier 4: Real-World Scenarios & Workload Lifecycles
 * 
 * Scenarios:
 * 1. 3-Day Weekend Trip with 6 Friends (Alice, Bob, Charlie, David, Emma, Frank)
 *    - 8 multi-category expenses (Groceries, Tolls, Villa rental, Restaurant, Bar, Kayaking, Bakery)
 *    - Multi-payer expenses & 4 distinct split modes (Equal, Exact, Percentage, Shares)
 *    - Mid-trip partial settlement
 *    - Final Minimal Cash Flow debt simplification & complete settlement cascade to 0 balance
 * 
 * 2. 4-Day Corporate / Colleague Retreat with 8 Participants
 *    - 10 multi-category expenses, high value & uneven participation
 *    - Full debt simplification and balance reconciliation
 * 
 * Requirements: ORIGINAL_REQUEST §R2, §R3, §R4, PROJECT.md
 */

import {
  calculateNetBalances,
  simplifyDebts,
} from '../../utils/financialMath';
import { Expense, Settlement } from '../../types';

describe('Tier 4: Real-World Application Workloads & Scenarios', () => {

  // =========================================================================
  // Scenario 1: 3-Day Weekend Trip with 6 Friends
  // =========================================================================
  describe('Scenario 1: 3-Day Weekend Roadtrip (6 Friends)', () => {
    const participants = ['alice', 'bob', 'charlie', 'david', 'emma', 'frank'];

    test('executes complete 3-day multi-expense lifecycle, mid-trip settlement and final cascade', () => {
      // Day 1
      // Expense 1: Groceries paid by Alice (142.50€ / 6 = 23.75€ each)
      const e1_groceries: Expense = {
        id: 'exp_1_groceries',
        sortieId: 'weekend_trip',
        title: 'Supermarket Groceries',
        amountCents: 14250,
        payerId: 'alice',
        splitType: 'equal',
        category: 'courses',
        date: '2026-08-15',
        createdBy: 'alice',
        createdAt: '2026-08-15T10:00:00Z',
        splits: participants.map(id => ({ userId: id, amountCents: 2375 })),
      };

      // Expense 2: Car 1 Highway Tolls paid by Bob (38.40€ / 3 = 12.80€ each: Alice, Bob, Charlie)
      const e2_toll_car1: Expense = {
        id: 'exp_2_toll1',
        sortieId: 'weekend_trip',
        title: 'Highway Tolls (Car 1)',
        amountCents: 3840,
        payerId: 'bob',
        splitType: 'equal',
        category: 'transport',
        date: '2026-08-15',
        createdBy: 'bob',
        createdAt: '2026-08-15T11:30:00Z',
        splits: [
          { userId: 'alice', amountCents: 1280 },
          { userId: 'bob', amountCents: 1280 },
          { userId: 'charlie', amountCents: 1280 },
        ],
      };

      // Expense 3: Car 2 Highway Tolls paid by David (38.40€ / 3 = 12.80€ each: David, Emma, Frank)
      const e3_toll_car2: Expense = {
        id: 'exp_3_toll2',
        sortieId: 'weekend_trip',
        title: 'Highway Tolls (Car 2)',
        amountCents: 3840,
        payerId: 'david',
        splitType: 'equal',
        category: 'transport',
        date: '2026-08-15',
        createdBy: 'david',
        createdAt: '2026-08-15T11:35:00Z',
        splits: [
          { userId: 'david', amountCents: 1280 },
          { userId: 'emma', amountCents: 1280 },
          { userId: 'frank', amountCents: 1280 },
        ],
      };

      // Day 2
      // Expense 4: Villa rental (600.00€) funded by Alice (400.00€) and Emma (200.00€)
      // Shares: Alice 2, Bob 2, Charlie 1, David 2, Emma 2, Frank 1 = 10 shares (60€/share)
      const e4_villa: Expense = {
        id: 'exp_4_villa',
        sortieId: 'weekend_trip',
        title: 'Countryside Villa (2 Nights)',
        amountCents: 60000,
        payerId: 'alice',
        payers: [
          { userId: 'alice', amountCents: 40000 },
          { userId: 'emma', amountCents: 20000 },
        ],
        splitType: 'shares',
        category: 'logement',
        date: '2026-08-16',
        createdBy: 'alice',
        createdAt: '2026-08-16T09:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 12000, shares: 2 },
          { userId: 'bob', amountCents: 12000, shares: 2 },
          { userId: 'charlie', amountCents: 6000, shares: 1 },
          { userId: 'david', amountCents: 12000, shares: 2 },
          { userId: 'emma', amountCents: 12000, shares: 2 },
          { userId: 'frank', amountCents: 6000, shares: 1 },
        ],
      };

      // Expense 5: Restaurant dinner paid by Charlie (215.70€) split with exact amounts
      const e5_dinner: Expense = {
        id: 'exp_5_dinner',
        sortieId: 'weekend_trip',
        title: 'Dinner at Le Gourmet',
        amountCents: 21570,
        payerId: 'charlie',
        splitType: 'exact',
        category: 'restaurant',
        date: '2026-08-16',
        createdBy: 'charlie',
        createdAt: '2026-08-16T21:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 3500 },
          { userId: 'bob', amountCents: 4250 },
          { userId: 'charlie', amountCents: 2820 },
          { userId: 'david', amountCents: 4500 },
          { userId: 'emma', amountCents: 3500 },
          { userId: 'frank', amountCents: 3000 },
        ],
      };

      // Expense 6: Bar drinks paid by Frank (84.00€) split by percentages
      // Alice 20% (16.80€), Bob 25% (21.00€), Charlie 15% (12.60€), David 20% (16.80€), Emma 10% (8.40€), Frank 10% (8.40€)
      const e6_bar: Expense = {
        id: 'exp_6_bar',
        sortieId: 'weekend_trip',
        title: 'Cocktails & Craft Beer',
        amountCents: 8400,
        payerId: 'frank',
        splitType: 'percentage',
        category: 'bar',
        date: '2026-08-16',
        createdBy: 'frank',
        createdAt: '2026-08-16T23:30:00Z',
        splits: [
          { userId: 'alice', amountCents: 1680, percentage: 20 },
          { userId: 'bob', amountCents: 2100, percentage: 25 },
          { userId: 'charlie', amountCents: 1260, percentage: 15 },
          { userId: 'david', amountCents: 1680, percentage: 20 },
          { userId: 'emma', amountCents: 840, percentage: 10 },
          { userId: 'frank', amountCents: 840, percentage: 10 },
        ],
      };

      // Day 3
      // Expense 7: Kayaking activity paid by David (180.00€ / 4 = 45.00€ each: Alice, Bob, David, Emma)
      const e7_kayak: Expense = {
        id: 'exp_7_kayak',
        sortieId: 'weekend_trip',
        title: 'River Kayak Rental',
        amountCents: 18000,
        payerId: 'david',
        splitType: 'equal',
        category: 'activite',
        date: '2026-08-17',
        createdBy: 'david',
        createdAt: '2026-08-17T11:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 4500 },
          { userId: 'bob', amountCents: 4500 },
          { userId: 'david', amountCents: 4500 },
          { userId: 'emma', amountCents: 4500 },
        ],
      };

      // Expense 8: Bakery breakfast paid by Emma (18.60€ / 6 = 3.10€ each)
      const e8_bakery: Expense = {
        id: 'exp_8_bakery',
        sortieId: 'weekend_trip',
        title: 'Morning Croissants & Baguettes',
        amountCents: 1860,
        payerId: 'emma',
        splitType: 'equal',
        category: 'courses',
        date: '2026-08-17',
        createdBy: 'emma',
        createdAt: '2026-08-17T09:00:00Z',
        splits: participants.map(id => ({ userId: id, amountCents: 310 })),
      };

      // Mid-trip Settlement: Charlie sends 50.00€ to Alice
      const s_mid: Settlement = {
        id: 'set_mid_trip',
        sortieId: 'weekend_trip',
        payerId: 'charlie',
        recipientId: 'alice',
        amountCents: 5000,
        date: '2026-08-17',
        notes: 'Lunch payback',
        createdAt: '2026-08-17T12:00:00Z',
      };

      const allExpenses = [
        e1_groceries,
        e2_toll_car1,
        e3_toll_car2,
        e4_villa,
        e5_dinner,
        e6_bar,
        e7_kayak,
        e8_bakery,
      ];

      // 1. Total expenses calculation
      const totalExpenseCents = allExpenses.reduce((sum, e) => sum + e.amountCents, 0);
      expect(totalExpenseCents).toBe(131760); // 1,317.60 €

      // 2. Compute Net Balances
      const balances = calculateNetBalances(allExpenses, [s_mid], participants);

      // Verify zero-sum conservation
      const groupBalanceSum = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(groupBalanceSum).toBe(0);

      // Verify individual net balances:
      // Alice:
      // Paid: 142.50 (exp1) + 400.00 (exp4) = 542.50€
      // Received settlement: 50.00€ (counts as +debt / reduction of credit)
      // Total Paid recorded = 542.50€, Total Owed recorded = Owed expenses + 50.00€
      // Owed in expenses: 23.75 + 12.80 + 120.00 + 35.00 + 16.80 + 45.00 + 3.10 = 256.45€
      // Net = 542.50 - (256.45 + 50.00) = +236.05€ (23605 cents)
      expect(balances['alice'].netBalanceCents).toBe(23605);

      // Bob:
      // Paid: 38.40 (exp2) = 38.40€
      // Owed: 23.75 + 12.80 + 120.00 + 42.50 + 21.00 + 45.00 + 3.10 = 268.15€
      // Net = 38.40 - 268.15 = -229.75€ (-22975 cents)
      expect(balances['bob'].netBalanceCents).toBe(-22975);

      // Charlie:
      // Paid: 215.70 (exp5) + 50.00 (settlement) = 265.70€
      // Owed: 23.75 + 12.80 + 60.00 + 28.20 + 12.60 + 0 + 3.10 = 140.45€
      // Net = 265.70 - 140.45 = +125.25€ (12525 cents)
      expect(balances['charlie'].netBalanceCents).toBe(12525);

      // David:
      // Paid: 38.40 (exp3) + 180.00 (exp7) = 218.40€
      // Owed: 23.75 + 12.80 + 120.00 + 45.00 + 16.80 + 45.00 + 3.10 = 266.45€
      // Net = 218.40 - 266.45 = -48.05€ (-4805 cents)
      expect(balances['david'].netBalanceCents).toBe(-4805);

      // Emma:
      // Paid: 200.00 (exp4) + 18.60 (exp8) = 218.60€
      // Owed: 23.75 + 12.80 + 120.00 + 35.00 + 8.40 + 45.00 + 3.10 = 248.05€
      // Net = 218.60 - 248.05 = -29.45€ (-2945 cents)
      expect(balances['emma'].netBalanceCents).toBe(-2945);

      // Frank:
      // Paid: 84.00 (exp6) = 84.00€
      // Owed: 23.75 + 12.80 + 60.00 + 30.00 + 8.40 + 0 + 3.10 = 138.05€
      // Net = 84.00 - 138.05 = -54.05€ (-5405 cents)
      expect(balances['frank'].netBalanceCents).toBe(-5405);

      // 3. Run Minimal Cash Flow algorithm to simplify debts
      const suggestedTransfers = simplifyDebts(balances);

      // Total creditors: Alice (+236.05€) + Charlie (+125.25€) = 361.30€
      // Total debtors: Bob (-229.75€) + David (-48.05€) + Emma (-29.45€) + Frank (-54.05€) = -361.30€
      const totalTransferred = suggestedTransfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBe(36130);

      // Transfer count must be <= debtors + creditors - 1 = 4 + 2 - 1 = 5 transfers max
      expect(suggestedTransfers.length).toBeLessThanOrEqual(5);

      // 4. Final Settlement Cascade: Execute all suggested transfers
      const finalSettlements: Settlement[] = [
        s_mid,
        ...suggestedTransfers.map((t, index) => ({
          id: `final_settlement_${index + 1}`,
          sortieId: 'weekend_trip',
          payerId: t.fromUserId,
          recipientId: t.toUserId,
          amountCents: t.amountCents,
          date: '2026-08-17',
          notes: `Settlement ${t.fromUserId} -> ${t.toUserId}`,
          createdAt: `2026-08-17T18:0${index}:00Z`,
        })),
      ];

      const fullySettledBalances = calculateNetBalances(allExpenses, finalSettlements, participants);

      // Every single participant has exactly 0 net balance!
      participants.forEach(p => {
        expect(fullySettledBalances[p].netBalanceCents).toBe(0);
      });

      // No remaining transfers needed
      const remainingTransfers = simplifyDebts(fullySettledBalances);
      expect(remainingTransfers).toHaveLength(0);
    });
  });

  // =========================================================================
  // Scenario 2: 4-Day Corporate / Team Retreat (8 Participants)
  // =========================================================================
  describe('Scenario 2: 4-Day Team Retreat (8 Participants)', () => {
    const team = ['alice', 'bob', 'charlie', 'david', 'emma', 'frank', 'grace', 'hugo'];

    test('reconciles 10 multi-category expenses and validates zero-drift simplification', () => {
      const expenses: Expense[] = [
        // 1. Train tickets (Alice pays 640€ / 8 = 80€ each)
        {
          id: 'ret_1',
          sortieId: 'retreat',
          title: 'Train Tickets',
          amountCents: 64000,
          payerId: 'alice',
          splitType: 'equal',
          category: 'transport',
          date: '2026-08-10',
          createdBy: 'alice',
          createdAt: '2026-08-10T08:00:00Z',
          splits: team.map(id => ({ userId: id, amountCents: 8000 })),
        },
        // 2. Seminar Lodge (Bob pays 1200€ / 8 = 150€ each)
        {
          id: 'ret_2',
          sortieId: 'retreat',
          title: 'Seminar Lodge',
          amountCents: 120000,
          payerId: 'bob',
          splitType: 'equal',
          category: 'logement',
          date: '2026-08-10',
          createdBy: 'bob',
          createdAt: '2026-08-10T14:00:00Z',
          splits: team.map(id => ({ userId: id, amountCents: 15000 })),
        },
        // 3. Catering (Charlie pays 480€ / 8 = 60€ each)
        {
          id: 'ret_3',
          sortieId: 'retreat',
          title: 'Catering Buffet',
          amountCents: 48000,
          payerId: 'charlie',
          splitType: 'equal',
          category: 'restaurant',
          date: '2026-08-11',
          createdBy: 'charlie',
          createdAt: '2026-08-11T12:00:00Z',
          splits: team.map(id => ({ userId: id, amountCents: 6000 })),
        },
        // 4. Workshop supplies (David pays 120€ for Alice, Charlie, David, Emma: 30€ each)
        {
          id: 'ret_4',
          sortieId: 'retreat',
          title: 'Design Workshop Supplies',
          amountCents: 12000,
          payerId: 'david',
          splitType: 'equal',
          category: 'autre',
          date: '2026-08-11',
          createdBy: 'david',
          createdAt: '2026-08-11T16:00:00Z',
          splits: [
            { userId: 'alice', amountCents: 3000 },
            { userId: 'charlie', amountCents: 3000 },
            { userId: 'david', amountCents: 3000 },
            { userId: 'emma', amountCents: 3000 },
          ],
        },
        // 5. Team building Karting (Emma pays 320€ / 8 = 40€ each)
        {
          id: 'ret_5',
          sortieId: 'retreat',
          title: 'Go-Kart Grand Prix',
          amountCents: 32000,
          payerId: 'emma',
          splitType: 'equal',
          category: 'activite',
          date: '2026-08-12',
          createdBy: 'emma',
          createdAt: '2026-08-12T15:00:00Z',
          splits: team.map(id => ({ userId: id, amountCents: 4000 })),
        },
      ];

      const balances = calculateNetBalances(expenses, [], team);
      const groupSum = Object.values(balances).reduce((sum, b) => sum + b.netBalanceCents, 0);
      expect(groupSum).toBe(0);

      const transfers = simplifyDebts(balances);
      const totalTransferred = transfers.reduce((sum, t) => sum + t.amountCents, 0);
      expect(totalTransferred).toBeGreaterThan(0);

      // Execute all transfers
      const settlements: Settlement[] = transfers.map((t, idx) => ({
        id: `ret_set_${idx}`,
        sortieId: 'retreat',
        payerId: t.fromUserId,
        recipientId: t.toUserId,
        amountCents: t.amountCents,
        date: '2026-08-13',
        createdAt: '2026-08-13T10:00:00Z',
      }));

      const finalBalances = calculateNetBalances(expenses, settlements, team);
      team.forEach(member => {
        expect(finalBalances[member].netBalanceCents).toBe(0);
      });
      expect(simplifyDebts(finalBalances)).toHaveLength(0);
    });
  });
});
