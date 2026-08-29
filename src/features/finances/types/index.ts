/**
 * Types et modèles de données du domaine Finances Partagées (Tricount-like).
 * Tous les calculs monétaires sont effectués en centimes entiers (cents)
 * pour garantir une précision absolue sans dérive en virgule flottante.
 */

/** Modes de répartition d'une dépense */
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

/** Catégories prédéfinies d'une dépense */
export type ExpenseCategory =
  | 'restaurant'
  | 'bar'
  | 'transport'
  | 'logement'
  | 'activite'
  | 'courses'
  | 'autre';

/** Payeur d'une dépense (support multi-payeurs) */
export interface ExpensePayer {
  userId: string;
  amountCents: number;
}

/** Part / contribution d'un bénéficiaire dans une dépense */
export interface ExpenseSplit {
  userId: string;
  amountCents: number;
  percentage?: number;
  shares?: number;
}

/** Modèle complet d'une dépense partagée */
export interface Expense {
  id: string;
  sortieId: string;
  title: string;
  amountCents: number;
  payerId: string;
  payers?: ExpensePayer[];
  splitType: SplitType;
  category: ExpenseCategory;
  date: string;
  createdBy: string;
  createdAt: string;
  splits: ExpenseSplit[];
}

/** Modèle d'un remboursement / règlement direct entre deux participants */
export interface Settlement {
  id: string;
  sortieId: string;
  payerId: string;
  recipientId: string;
  amountCents: number;
  date: string;
  notes?: string;
  createdAt: string;
}

/** Bilan net d'un utilisateur dans un groupe de dépenses */
export interface UserNetBalance {
  userId: string;
  totalPaidCents: number;
  totalOwedCents: number;
  /** Solde net : positif = créancier (on lui doit de l'argent), négatif = débiteur (il doit de l'argent), 0 = équilibré */
  netBalanceCents: number;
}

/** Suggestion de virement optimisée par l'algorithme de simplification des dettes */
export interface SuggestedTransfer {
  /** Identifiant du débiteur (celui qui paie / rembourse) */
  fromUserId: string;
  /** Identifiant du créancier (celui qui reçoit le paiement) */
  toUserId: string;
  /** Montant du virement en centimes */
  amountCents: number;
}

/** Contrat du moteur mathématique et algorithmique financier */
export interface FinancialMathEngine {
  calculateEqualSplit(totalCents: number, beneficiaryIds: string[]): Map<string, number>;
  calculatePercentageSplit(
    totalCents: number,
    percentages: { userId: string; percentage: number }[]
  ): Map<string, number>;
  calculateSharesSplit(
    totalCents: number,
    shares: { userId: string; shares: number }[]
  ): Map<string, number>;
  calculateNetBalances(
    expenses: Expense[],
    settlements: Settlement[],
    participantIds: string[]
  ): Record<string, UserNetBalance>;
  simplifyDebts(netBalances: Record<string, UserNetBalance>): SuggestedTransfer[];
}

/** Contrat de l'état et des actions du store Zustand Finances */
export interface FinancesState {
  expenses: Expense[];
  settlements: Settlement[];
  activeSortieId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setActiveSortieId: (sortieId: string | null) => void;
  fetchFinances: (sortieId: string) => Promise<void>;
  createExpense: (expenseData: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  createSettlement: (settlementData: CreateSettlementInput) => Promise<Settlement>;
  deleteSettlement: (id: string) => Promise<void>;

  // Computed Getters
  getNetBalances: () => Record<string, UserNetBalance>;
  getSuggestedTransfers: () => SuggestedTransfer[];
  getTotalExpensesCents: () => number;
  getUserBalanceCents: (userId: string) => number;
}

/** Entrée DTO pour la création d'une dépense */
export type CreateExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'date'> & {
  date?: string;
};

/** Entrée DTO pour la mise à jour d'une dépense */
export type UpdateExpenseInput = Partial<Omit<Expense, 'id' | 'createdAt'>>;

/** Entrée DTO pour la création d'un remboursement */
export type CreateSettlementInput = Omit<Settlement, 'id' | 'createdAt' | 'date'> & {
  date?: string;
};

/** Informations d'affichage et métadonnées d'une catégorie */
export interface ExpenseCategoryInfo {
  id: ExpenseCategory;
  label: string;
  iconName: string;
}

/** Liste descriptive des catégories de dépenses */
export const EXPENSE_CATEGORIES: readonly ExpenseCategoryInfo[] = [
  { id: 'restaurant', label: 'Restaurant', iconName: 'restaurant-outline' },
  { id: 'bar', label: 'Bar & Soirée', iconName: 'beer-outline' },
  { id: 'transport', label: 'Transport', iconName: 'car-outline' },
  { id: 'logement', label: 'Logement', iconName: 'bed-outline' },
  { id: 'activite', label: 'Activité', iconName: 'ticket-outline' },
  { id: 'courses', label: 'Courses & Nourriture', iconName: 'cart-outline' },
  { id: 'autre', label: 'Autre', iconName: 'ellipsis-horizontal-outline' },
] as const;

/** Modes de répartition avec libellés */
export interface SplitTypeInfo {
  id: SplitType;
  label: string;
  description: string;
}

export const SPLIT_TYPES: readonly SplitTypeInfo[] = [
  { id: 'equal', label: 'Égale', description: 'Divisé équitablement entre tous les participants' },
  { id: 'exact', label: 'Montants', description: 'Montant personnalisé par participant' },
  { id: 'percentage', label: 'Pourcentages', description: 'Répartition selon des pourcentages personnalisés' },
  { id: 'shares', label: 'Parts', description: 'Répartition par nombre de parts ou coefficients' },
] as const;
