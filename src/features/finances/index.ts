/**
 * Point d'entrée principal (barrel export) du module Finances Partagées (Crazer).
 */

export * from './types';
export * from './utils';
export * from './services/financesService';
export * from './store/useFinancesStore';
export * from './hooks/useFinances';
export * from './components/FinancesSummaryCard';
export * from './components/FinancesSegmentControl';
export * from './components/CategoryFilterChips';
export * from './components/ExpenseItem';
export * from './components/ExpenseList';
export * from './components/BalanceItem';
export * from './components/SettlementSuggestionCard';
export * from './components/BalancesView';
export * from './components/SplitModeSelector';
export * from './components/CategoryPicker';
export * from './components/ParticipantSplitRow';
export * from './components/SortieSelectorHeader';
export * from './components/AddExpenseModal';
export * from './components/SettleDebtModal';
