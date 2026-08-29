/**
 * Moteur mathématique et algorithmique financier pour Crazer (Finances Partagées).
 *
 * Principes fondamentaux :
 * 1. Arithmétique 100% entière en centimes (cents) : aucun calcul monétaire n'utilise de flottants sans conversion immédiate.
 * 2. Méthode des plus forts restes (Hare-Niemeyer) pour les répartitions (égale, pourcentage, parts).
 * 3. Conservation stricte des montants : sum(splits) = totalCents et sum(netBalances) = 0.
 * 4. Algorithme d'optimisation de règlement (Minimal Cash Flow) minimisant le nombre total de virements (<= N - 1).
 */

import {
  Expense,
  Settlement,
  UserNetBalance,
  SuggestedTransfer,
  FinancialMathEngine,
} from '../types';
import { formatCentsToEuros, parseEurosToCents, formatDate } from './formatters';

// Re-export des formateurs pour compatibilité et commodité
export { formatCentsToEuros, parseEurosToCents, formatDate };

/**
 * Répartition égale d'un montant entre plusieurs bénéficiaires avec méthode Hare-Niemeyer.
 * Distribue les centimes résiduels de manière déterministe sur l'ordre de la liste fournie.
 *
 * @param totalCents - Montant total de la dépense en centimes
 * @param beneficiaryIds - Liste des identifiants des bénéficiaires
 * @returns Map associant chaque userId à son montant alloué en centimes
 */
export function calculateEqualSplit(
  totalCents: number,
  beneficiaryIds: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (!beneficiaryIds || beneficiaryIds.length === 0) {
    return result;
  }

  if (totalCents <= 0) {
    for (const id of beneficiaryIds) {
      result.set(id, 0);
    }
    return result;
  }

  const n = beneficiaryIds.length;
  const baseCents = Math.floor(totalCents / n);
  const remainder = totalCents % n;

  beneficiaryIds.forEach((id, index) => {
    const extraCent = index < remainder ? 1 : 0;
    result.set(id, baseCents + extraCent);
  });

  return result;
}

/**
 * Validation et mapping d'une répartition par montants exacts personnalisés.
 * Lève une exception si la somme des allocations ne correspond pas exactement au total.
 *
 * @param totalCents - Montant total de la dépense en centimes
 * @param allocations - Liste des allocations personnalisées { userId, amountCents }
 * @returns Map associant chaque userId à son montant en centimes
 */
export function calculateExactSplit(
  totalCents: number,
  allocations: { userId: string; amountCents: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (!allocations || allocations.length === 0) {
    if (totalCents !== 0) {
      throw new Error(`Total amount ${totalCents} cannot be split among 0 allocations`);
    }
    return result;
  }

  let sum = 0;
  for (const alloc of allocations) {
    if (alloc.amountCents < 0) {
      throw new Error(
        `Allocation for user ${alloc.userId} cannot be negative (${alloc.amountCents})`
      );
    }
    sum += alloc.amountCents;
    result.set(alloc.userId, alloc.amountCents);
  }

  if (sum !== totalCents) {
    throw new Error(
      `Exact split sum (${sum} cents) does not match total expense amount (${totalCents} cents)`
    );
  }

  return result;
}

/**
 * Répartition proportionnelle par pourcentages personnalisés avec méthode Hare-Niemeyer.
 * Garantit que la somme exacte des centimes alloués égale le montant total sans dérive.
 *
 * @param totalCents - Montant total de la dépense en centimes
 * @param percentages - Liste des pourcentages { userId, percentage }
 * @returns Map associant chaque userId à son montant alloué en centimes
 */
export function calculatePercentageSplit(
  totalCents: number,
  percentages: { userId: string; percentage: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (!percentages || percentages.length === 0) {
    return result;
  }

  if (totalCents <= 0) {
    for (const p of percentages) {
      result.set(p.userId, 0);
    }
    return result;
  }

  const totalPercentage = percentages.reduce(
    (sum, p) => sum + (p.percentage > 0 ? p.percentage : 0),
    0
  );
  if (totalPercentage <= 0) {
    for (const p of percentages) {
      result.set(p.userId, 0);
    }
    return result;
  }

  const divisor = Math.abs(totalPercentage - 100) < 0.001 ? 100 : totalPercentage;

  const items = percentages.map((p, index) => {
    const exactShare = p.percentage <= 0 ? 0 : (totalCents * p.percentage) / divisor;
    const baseCents = Math.floor(exactShare);
    const remainder = exactShare - baseCents;
    return {
      userId: p.userId,
      baseCents,
      remainder,
      originalIndex: index,
    };
  });

  const currentSum = items.reduce((sum, item) => sum + item.baseCents, 0);
  const missingCents = totalCents - currentSum;

  const sortedForDistribution = [...items].sort((a, b) => {
    const diff = b.remainder - a.remainder;
    if (Math.abs(diff) > 1e-9) {
      return diff;
    }
    return a.originalIndex - b.originalIndex;
  });

  const bonusMap = new Map<string, number>();
  for (let i = 0; i < missingCents && i < sortedForDistribution.length; i++) {
    const id = sortedForDistribution[i].userId;
    bonusMap.set(id, (bonusMap.get(id) || 0) + 1);
  }

  for (const item of items) {
    const bonus = bonusMap.get(item.userId) || 0;
    result.set(item.userId, item.baseCents + bonus);
  }

  return result;
}

/**
 * Répartition pondérée par parts / coefficients avec méthode Hare-Niemeyer.
 *
 * @param totalCents - Montant total de la dépense en centimes
 * @param shares - Liste des parts { userId, shares }
 * @returns Map associant chaque userId à son montant alloué en centimes
 */
export function calculateSharesSplit(
  totalCents: number,
  shares: { userId: string; shares: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (!shares || shares.length === 0) {
    return result;
  }

  if (totalCents <= 0) {
    for (const s of shares) {
      result.set(s.userId, 0);
    }
    return result;
  }

  const totalShares = shares.reduce((sum, s) => sum + (s.shares > 0 ? s.shares : 0), 0);
  if (totalShares <= 0) {
    for (const s of shares) {
      result.set(s.userId, 0);
    }
    return result;
  }

  const items = shares.map((s, index) => {
    const exactShare = s.shares <= 0 ? 0 : (totalCents * s.shares) / totalShares;
    const baseCents = Math.floor(exactShare);
    const remainder = exactShare - baseCents;
    return {
      userId: s.userId,
      baseCents,
      remainder,
      originalIndex: index,
    };
  });

  const currentSum = items.reduce((sum, item) => sum + item.baseCents, 0);
  const missingCents = totalCents - currentSum;

  const sortedForDistribution = [...items].sort((a, b) => {
    const diff = b.remainder - a.remainder;
    if (Math.abs(diff) > 1e-9) {
      return diff;
    }
    return a.originalIndex - b.originalIndex;
  });

  const bonusMap = new Map<string, number>();
  for (let i = 0; i < missingCents && i < sortedForDistribution.length; i++) {
    const id = sortedForDistribution[i].userId;
    bonusMap.set(id, (bonusMap.get(id) || 0) + 1);
  }

  for (const item of items) {
    const bonus = bonusMap.get(item.userId) || 0;
    result.set(item.userId, item.baseCents + bonus);
  }

  return result;
}

/**
 * Calcule le bilan net (total payé, total dû, solde net) de chaque participant
 * à partir de l'historique complet des dépenses et des règlements directs.
 *
 * Invariant mathématique garanti : sum(netBalanceCents) = 0.
 *
 * @param expenses - Liste des dépenses de la sortie
 * @param settlements - Liste des règlements directs enregistrés
 * @param participantIds - Liste des identifiants des membres du groupe
 * @returns Record associant chaque userId à son UserNetBalance
 */
export function calculateNetBalances(
  expenses: Expense[] = [],
  settlements: Settlement[] = [],
  participantIds: string[] = []
): Record<string, UserNetBalance> {
  const balances: Record<string, UserNetBalance> = {};

  const getOrCreate = (userId: string): UserNetBalance => {
    if (!balances[userId]) {
      balances[userId] = {
        userId,
        totalPaidCents: 0,
        totalOwedCents: 0,
        netBalanceCents: 0,
      };
    }
    return balances[userId];
  };

  // 1. Initialiser les participants explicitement déclarés
  for (const id of participantIds) {
    getOrCreate(id);
  }

  // 2. Traiter les dépenses
  for (const expense of expenses) {
    // A. Payeurs (support mono-payeur et multi-payeurs)
    if (expense.payers && expense.payers.length > 0) {
      for (const payer of expense.payers) {
        const record = getOrCreate(payer.userId);
        record.totalPaidCents += payer.amountCents;
      }
    } else if (expense.payerId) {
      const record = getOrCreate(expense.payerId);
      record.totalPaidCents += expense.amountCents;
    }

    // B. Bénéficiaires / parts
    if (expense.splits && expense.splits.length > 0) {
      for (const split of expense.splits) {
        const record = getOrCreate(split.userId);
        record.totalOwedCents += split.amountCents;
      }
    }
  }

  // 3. Traiter les règlements directs (settlements)
  for (const settlement of settlements) {
    // Le payeur du remboursement augmente son totalPaidCents (crédit de remboursement)
    const payerRecord = getOrCreate(settlement.payerId);
    payerRecord.totalPaidCents += settlement.amountCents;

    // Le destinataire du remboursement augmente son totalOwedCents (dette de perception / solde diminué)
    const recipientRecord = getOrCreate(settlement.recipientId);
    recipientRecord.totalOwedCents += settlement.amountCents;
  }

  // 4. Calculer les soldes nets
  for (const userId of Object.keys(balances)) {
    const b = balances[userId];
    b.netBalanceCents = b.totalPaidCents - b.totalOwedCents;
  }

  return balances;
}

/**
 * Algorithme Minimal Cash Flow (Greedy Debt Simplification) en O(N log N).
 * Transforme un réseau complexe de dettes croisées en un nombre minimal de virements simples (<= N - 1).
 *
 * @param netBalances - Soldes nets des participants (Record, tableau ou Map)
 * @returns Liste ordonnée des virements suggérés { fromUserId, toUserId, amountCents }
 */
export function simplifyDebts(
  netBalances: Record<string, UserNetBalance> | UserNetBalance[] | Map<string, UserNetBalance>
): SuggestedTransfer[] {
  const transfers: SuggestedTransfer[] = [];

  let balanceList: UserNetBalance[] = [];
  if (Array.isArray(netBalances)) {
    balanceList = netBalances;
  } else if (netBalances instanceof Map) {
    balanceList = Array.from(netBalances.values());
  } else if (netBalances && typeof netBalances === 'object') {
    balanceList = Object.values(netBalances);
  }

  // Séparer les débiteurs (solde négatif) et les créanciers (solde positif)
  const debtors: { userId: string; amount: number }[] = [];
  const creditors: { userId: string; amount: number }[] = [];

  for (const b of balanceList) {
    if (b.netBalanceCents < 0) {
      debtors.push({ userId: b.userId, amount: -b.netBalanceCents });
    } else if (b.netBalanceCents > 0) {
      creditors.push({ userId: b.userId, amount: b.netBalanceCents });
    }
  }

  // Résolution gloutonne : associer le plus gros débiteur au plus gros créancier
  while (debtors.length > 0 && creditors.length > 0) {
    // Trier par montant décroissant, avec bris d'égalité déterministe sur userId
    debtors.sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));
    creditors.sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

    const debtor = debtors[0];
    const creditor = creditors[0];

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      transfers.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountCents: transferAmount,
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) {
      debtors.shift();
    }
    if (creditor.amount === 0) {
      creditors.shift();
    }
  }

  return transfers;
}

/**
 * Instance conforme au contrat FinancialMathEngine
 */
export const financialMathEngine: FinancialMathEngine = {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateNetBalances,
  simplifyDebts,
};
