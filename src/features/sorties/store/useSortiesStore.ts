import { create } from 'zustand';
import { Sortie } from '@/shared/types';

interface SortiesState {
  sorties: Sortie[];
  selectedSortieId: string | null;
  addSortie: (sortie: Sortie) => void;
  selectSortie: (id: string | null) => void;
  updateSortieStatus: (id: string, status: Sortie['status']) => void;
}

const mockSorties: Sortie[] = [
  {
    id: '1',
    title: 'Soirée Burger & Bowling',
    description: 'Une soirée détente entre amis après les partiels !',
    isPrivate: true,
    creatorId: 'user-1',
    participantIds: ['user-1', 'user-2', 'user-3'],
    status: 'planned',
    scheduledDate: '2026-07-25T19:30:00Z',
    meetingPoint: 'Devant la gare du Nord',
    activityIds: ['act-1', 'act-2'],
    createdAt: '2026-07-20T10:00:00Z',
  },
];

export const useSortiesStore = create<SortiesState>((set) => ({
  sorties: mockSorties,
  selectedSortieId: '1',
  addSortie: (sortie) =>
    set((state) => ({
      sorties: [sortie, ...state.sorties],
    })),
  selectSortie: (id) => set({ selectedSortieId: id }),
  updateSortieStatus: (id, status) =>
    set((state) => ({
      sorties: state.sorties.map((s) => (s.id === id ? { ...s, status } : s)),
    })),
}));
