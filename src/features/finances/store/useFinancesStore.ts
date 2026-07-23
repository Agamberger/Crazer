import { create } from 'zustand';
import { Depense } from '@/shared/types';

interface FinancesState {
  depenses: Depense[];
  addDepense: (depense: Depense) => void;
}

const mockDepenses: Depense[] = [
  {
    id: 'dep-1',
    sortieId: '1',
    title: 'Addition Burger Bar',
    amount: 54.0,
    payerId: 'user-1',
    beneficiaryIds: ['user-1', 'user-2', 'user-3'],
    createdAt: '2026-07-25T20:45:00Z',
  },
];

export const useFinancesStore = create<FinancesState>((set) => ({
  depenses: mockDepenses,
  addDepense: (depense) =>
    set((state) => ({
      depenses: [depense, ...state.depenses],
    })),
}));
