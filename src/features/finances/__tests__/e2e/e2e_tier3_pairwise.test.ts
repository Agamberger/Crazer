/**
 * E2E Acceptance Test Suite — Tier 3: Cross-Feature Interactions & Combinations
 * 
 * Pairwise & Multi-Feature Interactions:
 * - Multi-Payer + Percentage Split + Partial Settlement
 * - Shares Split + Multi-Payer + Full Settlement Cascade
 * - Equal Split + Multi-Payer + Category Accumulation
 * - Exact Amounts Split + Multi-Payer + Symmetrical Cross-Reimbursement
 * - Dynamic Incremental State Updates (Expense -> Settlement -> Expense)
 * - Mixed Split Modes (Equal + Exact + Percentage + Shares) in a Single Sortie
 * 
 * Requirements: ORIGINAL_REQUEST §R2, PROJECT.md §Interface Contracts
 */

import {
  calculateNetBalances,
  simplifyDebts,
} from '../../utils/financialMath';
import { Expense, Settlement } from '../../types';

describe('Tier 3: Cross-Feature Interactions & Combinations', () => {

  // =========================================================================
  // 1. Multi-Payer + Percentage Split + Partial Settlement
  // =========================================================================
  test('Combination 1: Multi-Payer + Percentage Split + Partial Settlement', () => {
    // Expense: 100€ funded by Alice (60€) and Bob (40€)
    // Beneficiaries: Charlie (50%), Alice (30%), Bob (20%)
    const expense: Expense = {
      id: 'exp_mp_pct',
      sortieId: 's_combo_1',
      title: 'Shared Gear & Supplies',
      amountCents: 10000,
      payerId: 'alice',
      payers: [
        { userId: 'alice', amountCents: 6000 },
        { userId: 'bob', amountCents: 4000 },
      ],
      splitType: 'percentage',
      category: 'autre',
      date: '2026-08-17',
      createdBy: 'alice',
      createdAt: '2026-08-17T10:00:00Z',
      splits: [
        { userId: 'charlie', amountCents: 5000, percentage: 50 },
        { userId: 'alice', amountCents: 3000, percentage: 30 },
        { userId: 'bob', amountCents: 2000, percentage: 20 },
      ],
    };

    // Pre-settlement state
    const preBalances = calculateNetBalances([expense], [], ['alice', 'bob', 'charlie']);
    expect(preBalances['alice'].netBalanceCents).toBe(3000);   // +30€ (paid 60€, owed 30€)
    expect(preBalances['bob'].netBalanceCents).toBe(2000);     // +20€ (paid 40€, owed 20€)
    expect(preBalances['charlie'].netBalanceCents).toBe(-5000);// -50€ (paid 0€, owed 50€)

    // Charlie makes a partial settlement of 20€ to Alice
    const partialSettlement: Settlement = {
      id: 'set_c_to_a',
      sortieId: 's_combo_1',
      payerId: 'charlie',
      recipientId: 'alice',
      amountCents: 2000,
      date: '2026-08-17',
      createdAt: '2026-08-17T11:00:00Z',
    };

    const postBalances = calculateNetBalances([expense], [partialSettlement], ['alice', 'bob', 'charlie']);
    expect(postBalances['alice'].netBalanceCents).toBe(1000);   // +10€ remaining credit
    expect(postBalances['bob'].netBalanceCents).toBe(2000);     // +20€ remaining credit
    expect(postBalances['charlie'].netBalanceCents).toBe(-3000);// -30€ remaining debt

    // Simplified transfers
    const remainingTransfers = simplifyDebts(postBalances);
    expect(remainingTransfers).toHaveLength(2);
    expect(remainingTransfers).toEqual(
      expect.arrayContaining([
        { fromUserId: 'charlie', toUserId: 'bob', amountCents: 2000 },
        { fromUserId: 'charlie', toUserId: 'alice', amountCents: 1000 },
      ])
    );
  });

  // =========================================================================
  // 2. Shares Split + Multi-Payer + Full Settlement Cascade
  // =========================================================================
  test('Combination 2: Shares Split + Multi-Payer + Full Settlement Cascade', () => {
    // 3 payers fund a 300€ villa rental: Alice 150€, Bob 100€, Charlie 50€
    // Shares: Alice 3, Bob 2, Charlie 1, Dave 4 (Total 10 shares)
    const expense: Expense = {
      id: 'exp_villa',
      sortieId: 's_combo_2',
      title: 'Villa Rental',
      amountCents: 30000,
      payerId: 'alice',
      payers: [
        { userId: 'alice', amountCents: 15000 },
        { userId: 'bob', amountCents: 10000 },
        { userId: 'charlie', amountCents: 5000 },
      ],
      splitType: 'shares',
      category: 'logement',
      date: '2026-08-17',
      createdBy: 'alice',
      createdAt: '2026-08-17T09:00:00Z',
      splits: [
        { userId: 'alice', amountCents: 9000, shares: 3 },
        { userId: 'bob', amountCents: 6000, shares: 2 },
        { userId: 'charlie', amountCents: 3000, shares: 1 },
        { userId: 'dave', amountCents: 12000, shares: 4 },
      ],
    };

    const participants = ['alice', 'bob', 'charlie', 'dave'];
    const initialBalances = calculateNetBalances([expense], [], participants);
    expect(initialBalances['alice'].netBalanceCents).toBe(6000);   // +60€ (150 - 90)
    expect(initialBalances['bob'].netBalanceCents).toBe(4000);     // +40€ (100 - 60)
    expect(initialBalances['charlie'].netBalanceCents).toBe(2000); // +20€ (50 - 30)
    expect(initialBalances['dave'].netBalanceCents).toBe(-12000);  // -120€ (0 - 120)

    // Dave executes recommended transfers directly to all 3 creditors
    const settlements: Settlement[] = [
      { id: 's1', sortieId: 's_combo_2', payerId: 'dave', recipientId: 'alice', amountCents: 6000, date: '2026-08-17', createdAt: '2026-08-17T10:00:00Z' },
      { id: 's2', sortieId: 's_combo_2', payerId: 'dave', recipientId: 'bob', amountCents: 4000, date: '2026-08-17', createdAt: '2026-08-17T11:00:00Z' },
      { id: 's3', sortieId: 's_combo_2', payerId: 'dave', recipientId: 'charlie', amountCents: 2000, date: '2026-08-17', createdAt: '2026-08-17T12:00:00Z' },
    ];

    const settledBalances = calculateNetBalances([expense], settlements, participants);
    participants.forEach(p => {
      expect(settledBalances[p].netBalanceCents).toBe(0);
    });

    const finalTransfers = simplifyDebts(settledBalances);
    expect(finalTransfers).toHaveLength(0);
  });

  // =========================================================================
  // 3. Equal Split + Multi-Payer + Multiple Categories
  // =========================================================================
  test('Combination 3: Equal Split + Multi-Payer + Multiple Categories', () => {
    const expenses: Expense[] = [
      {
        id: 'e_transport',
        sortieId: 's_combo_3',
        title: 'Highway Tolls',
        amountCents: 4000,
        payerId: 'alice',
        splitType: 'equal',
        category: 'transport',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T08:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2000 },
          { userId: 'bob', amountCents: 2000 },
        ],
      },
      {
        id: 'e_courses',
        sortieId: 's_combo_3',
        title: 'Supermarket Groceries',
        amountCents: 6000,
        payerId: 'bob',
        splitType: 'equal',
        category: 'courses',
        date: '2026-08-17',
        createdBy: 'bob',
        createdAt: '2026-08-17T12:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 2000 },
          { userId: 'bob', amountCents: 2000 },
          { userId: 'charlie', amountCents: 2000 },
        ],
      },
      {
        id: 'e_resto',
        sortieId: 's_combo_3',
        title: 'Dinner at Bistro',
        amountCents: 12000,
        payerId: 'alice',
        payers: [
          { userId: 'alice', amountCents: 9000 },
          { userId: 'charlie', amountCents: 3000 },
        ],
        splitType: 'equal',
        category: 'restaurant',
        date: '2026-08-17',
        createdBy: 'alice',
        createdAt: '2026-08-17T20:00:00Z',
        splits: [
          { userId: 'alice', amountCents: 4000 },
          { userId: 'bob', amountCents: 4000 },
          { userId: 'charlie', amountCents: 4000 },
        ],
      },
    ];

    const participants = ['alice', 'bob', 'charlie'];
    const balances = calculateNetBalances(expenses, [], participants);

    // Alice: paid (40 + 0 + 90) = 130€; owed (20 + 20 + 40) = 80€ => net +50€
    expect(balances['alice'].totalPaidCents).toBe(13000);
    expect(balances['alice'].totalOwedCents).toBe(8000);
    expect(balances['alice'].netBalanceCents).toBe(5000);

    // Bob: paid (0 + 60 + 0) = 60€; owed (20 + 20 + 40) = 80€ => net -20€
    expect(balances['bob'].totalPaidCents).toBe(6000);
    expect(balances['bob'].totalOwedCents).toBe(8000);
    expect(balances['bob'].netBalanceCents).toBe(-2000);

    // Charlie: paid (0 + 0 + 30) = 30€; owed (0 + 20 + 40) = 60€ => net -30€
    expect(balances['charlie'].totalPaidCents).toBe(3000);
    expect(balances['charlie'].totalOwedCents).toBe(6000);
    expect(balances['charlie'].netBalanceCents).toBe(-3000);

    const transfers = simplifyDebts(balances);
    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual(
      expect.arrayContaining([
        { fromUserId: 'charlie', toUserId: 'alice', amountCents: 3000 },
        { fromUserId: 'bob', toUserId: 'alice', amountCents: 2000 },
      ])
    );
  });

  // =========================================================================
  // 4. Exact Amounts Split + Multi-Payer + Direct Settlement
  // =========================================================================
  test('Combination 4: Exact Amounts Split + Multi-Payer + Direct Settlement', () => {
    // 2 payers fund custom exact amounts for 4 friends
    const expense: Expense = {
      id: 'e_itemized',
      sortieId: 's_combo_4',
      title: 'Tapas Bar',
      amountCents: 8550, // 85.50€
      payerId: 'alice',
      payers: [
        { userId: 'alice', amountCents: 5000 },
        { userId: 'david', amountCents: 3550 },
      ],
      splitType: 'exact',
      category: 'bar',
      date: '2026-08-17',
      createdBy: 'alice',
      createdAt: '2026-08-17T21:00:00Z',
      splits: [
        { userId: 'alice', amountCents: 1500 },
        { userId: 'bob', amountCents: 2800 },
        { userId: 'charlie', amountCents: 2250 },
        { userId: 'david', amountCents: 2000 },
      ],
    };

    const participants = ['alice', 'bob', 'charlie', 'david'];
    const preBalances = calculateNetBalances([expense], [], participants);

    // Alice: paid 50.00 - owed 15.00 = +35.00€
    expect(preBalances['alice'].netBalanceCents).toBe(3500);
    // David: paid 35.50 - owed 20.00 = +15.50€
    expect(preBalances['david'].netBalanceCents).toBe(1550);
    // Bob: paid 0 - owed 28.00 = -28.00€
    expect(preBalances['bob'].netBalanceCents).toBe(-2800);
    // Charlie: paid 0 - owed 22.50 = -22.50€
    expect(preBalances['charlie'].netBalanceCents).toBe(-2250);

    // Bob settles 28.00€ directly to Alice
    const settlement: Settlement = {
      id: 's_bob_alice',
      sortieId: 's_combo_4',
      payerId: 'bob',
      recipientId: 'alice',
      amountCents: 2800,
      date: '2026-08-17',
      createdAt: '2026-08-17T22:00:00Z',
    };

    const postBalances = calculateNetBalances([expense], [settlement], participants);
    expect(postBalances['bob'].netBalanceCents).toBe(0);
    expect(postBalances['alice'].netBalanceCents).toBe(700);  // 35.00 - 28.00 = +7.00€
    expect(postBalances['david'].netBalanceCents).toBe(1550); // +15.50€
    expect(postBalances['charlie'].netBalanceCents).toBe(-2250); // -22.50€

    const transfers = simplifyDebts(postBalances);
    expect(transfers).toHaveLength(2);
    // Charlie pays remaining 7€ to Alice and 15.50€ to David
    expect(transfers).toEqual(
      expect.arrayContaining([
        { fromUserId: 'charlie', toUserId: 'david', amountCents: 1550 },
        { fromUserId: 'charlie', toUserId: 'alice', amountCents: 700 },
      ])
    );
  });

  // =========================================================================
  // 5. Dynamic State Progression Chain (Expense -> Settlement -> Expense)
  // =========================================================================
  test('Combination 5: Dynamic State Progression Chain', () => {
    const participants = ['alice', 'bob'];

    // Step 1: Expense 1 (Alice pays 40€ for both)
    const e1: Expense = {
      id: 'e1',
      sortieId: 's_chain',
      title: 'Tickets',
      amountCents: 4000,
      payerId: 'alice',
      splitType: 'equal',
      category: 'activite',
      date: '2026-08-17',
      createdBy: 'alice',
      createdAt: '2026-08-17T09:00:00Z',
      splits: [
        { userId: 'alice', amountCents: 2000 },
        { userId: 'bob', amountCents: 2000 },
      ],
    };

    const balStep1 = calculateNetBalances([e1], [], participants);
    expect(balStep1['alice'].netBalanceCents).toBe(2000);
    expect(balStep1['bob'].netBalanceCents).toBe(-2000);

    // Step 2: Bob settles 20€ to Alice
    const s1: Settlement = {
      id: 's1',
      sortieId: 's_chain',
      payerId: 'bob',
      recipientId: 'alice',
      amountCents: 2000,
      date: '2026-08-17',
      createdAt: '2026-08-17T11:00:00Z',
    };

    const balStep2 = calculateNetBalances([e1], [s1], participants);
    expect(balStep2['alice'].netBalanceCents).toBe(0);
    expect(balStep2['bob'].netBalanceCents).toBe(0);

    // Step 3: Bob pays 50€ dinner for both
    const e2: Expense = {
      id: 'e2',
      sortieId: 's_chain',
      title: 'Dinner',
      amountCents: 5000,
      payerId: 'bob',
      splitType: 'equal',
      category: 'restaurant',
      date: '2026-08-17',
      createdBy: 'bob',
      createdAt: '2026-08-17T19:00:00Z',
      splits: [
        { userId: 'alice', amountCents: 2500 },
        { userId: 'bob', amountCents: 2500 },
      ],
    };

    const balStep3 = calculateNetBalances([e1, e2], [s1], participants);
    expect(balStep3['alice'].netBalanceCents).toBe(-2500); // Alice now owes 25€
    expect(balStep3['bob'].netBalanceCents).toBe(2500);   // Bob is now creditor +25€

    const transfers = simplifyDebts(balStep3);
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toEqual({
      fromUserId: 'alice',
      toUserId: 'bob',
      amountCents: 2500,
    });
  });

  // =========================================================================
  // 6. Mixed Split Modes in Single Sortie (Equal + Exact + % + Shares)
  // =========================================================================
  test('Combination 6: 4 Different Split Modes Co-Existing in One Sortie', () => {
    const participants = ['u1', 'u2', 'u3', 'u4', 'u5'];

    // 1. Equal split (100€ / 5 = 20€ each) paid by u1
    const eEqual: Expense = {
      id: 'e_eq',
      sortieId: 's_mixed',
      title: 'Equal Activity',
      amountCents: 10000,
      payerId: 'u1',
      splitType: 'equal',
      category: 'activite',
      date: '2026-08-17',
      createdBy: 'u1',
      createdAt: '2026-08-17T10:00:00Z',
      splits: participants.map(id => ({ userId: id, amountCents: 2000 })),
    };

    // 2. Exact amounts (50€: u2 25€, u3 15€, u4 10€) paid by u2
    const eExact: Expense = {
      id: 'e_ex',
      sortieId: 's_mixed',
      title: 'Exact Snacks',
      amountCents: 5000,
      payerId: 'u2',
      splitType: 'exact',
      category: 'courses',
      date: '2026-08-17',
      createdBy: 'u2',
      createdAt: '2026-08-17T12:00:00Z',
      splits: [
        { userId: 'u2', amountCents: 2500 },
        { userId: 'u3', amountCents: 1500 },
        { userId: 'u4', amountCents: 1000 },
      ],
    };

    // 3. Percentage split (80€: u1 50%, u5 50%) paid by u3
    const ePct: Expense = {
      id: 'e_pct',
      sortieId: 's_mixed',
      title: 'Fuel',
      amountCents: 8000,
      payerId: 'u3',
      splitType: 'percentage',
      category: 'transport',
      date: '2026-08-17',
      createdBy: 'u3',
      createdAt: '2026-08-17T14:00:00Z',
      splits: [
        { userId: 'u1', amountCents: 4000, percentage: 50 },
        { userId: 'u5', amountCents: 4000, percentage: 50 },
      ],
    };

    // 4. Shares split (120€: u1:1, u2:2, u4:3 => 6 shares = 20€/share) paid by u4
    const eShares: Expense = {
      id: 'e_sh',
      sortieId: 's_mixed',
      title: 'Equipment Rental',
      amountCents: 12000,
      payerId: 'u4',
      splitType: 'shares',
      category: 'autre',
      date: '2026-08-17',
      createdBy: 'u4',
      createdAt: '2026-08-17T16:00:00Z',
      splits: [
        { userId: 'u1', amountCents: 2000, shares: 1 },
        { userId: 'u2', amountCents: 4000, shares: 2 },
        { userId: 'u4', amountCents: 6000, shares: 3 },
      ],
    };

    const balances = calculateNetBalances([eEqual, eExact, ePct, eShares], [], participants);

    // Sum of net balances must be strictly 0
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalanceCents, 0);
    expect(sum).toBe(0);

    // u1: Paid 100€; Owed (20 + 0 + 40 + 20) = 80€ => net +20€
    expect(balances['u1'].netBalanceCents).toBe(2000);
    // u2: Paid 50€; Owed (20 + 25 + 0 + 40) = 85€ => net -35€
    expect(balances['u2'].netBalanceCents).toBe(-3500);
    // u3: Paid 80€; Owed (20 + 15 + 0 + 0) = 35€ => net +45€
    expect(balances['u3'].netBalanceCents).toBe(4500);
    // u4: Paid 120€; Owed (20 + 10 + 0 + 60) = 90€ => net +30€
    expect(balances['u4'].netBalanceCents).toBe(3000);
    // u5: Paid 0€; Owed (20 + 0 + 40 + 0) = 60€ => net -60€
    expect(balances['u5'].netBalanceCents).toBe(-6000);

    const transfers = simplifyDebts(balances);
    const totalTransferred = transfers.reduce((acc, t) => acc + t.amountCents, 0);
    // Positive creditors sum: 20 + 45 + 30 = 95€
    expect(totalTransferred).toBe(9500);
    expect(transfers.length).toBeLessThanOrEqual(4);
  });
});
