import { create } from 'zustand';
import { JournalAventure } from '@/shared/types';

interface JournalState {
  journals: JournalAventure[];
  addPhoto: (journalId: string, photoUrl: string) => void;
}

const mockJournals: JournalAventure[] = [
  {
    id: 'jou-1',
    sortieId: '1',
    title: 'Souvenirs Soirée Burger & Bowling',
    photos: [],
    notes: ['Super soirée, victoire écrasante au bowling !'],
    createdAt: '2026-07-25T23:00:00Z',
  },
];

export const useJournalStore = create<JournalState>((set) => ({
  journals: mockJournals,
  addPhoto: (journalId, photoUrl) =>
    set((state) => ({
      journals: state.journals.map((j) =>
        j.id === journalId ? { ...j, photos: [...j.photos, photoUrl] } : j,
      ),
    })),
}));
