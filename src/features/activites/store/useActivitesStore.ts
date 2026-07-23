import { create } from 'zustand';
import { Activite } from '@/shared/types';

interface ActivitesState {
  activites: Activite[];
  userVotes: Record<string, 'like' | 'dislike'>;
  voteActivite: (id: string, vote: 'like' | 'dislike') => void;
}

const mockActivites: Activite[] = [
  {
    id: 'act-1',
    title: 'Smash Burger Bar',
    description: 'Les meilleurs burgers artisanaux du quartier avec frites maison.',
    category: 'restaurant',
    location: {
      address: '12 Rue des Gourmets, Paris',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    estimatedBudget: 18,
    rating: 4.8,
  },
  {
    id: 'act-2',
    title: 'Strike Bowling Club',
    description: 'Bowling rétro 16 pistes avec bar à cocktails et billards.',
    category: 'sport',
    location: {
      address: '45 Avenue du Jeu, Paris',
      latitude: 48.8606,
      longitude: 2.3411,
    },
    estimatedBudget: 15,
    rating: 4.6,
  },
];

export const useActivitesStore = create<ActivitesState>((set) => ({
  activites: mockActivites,
  userVotes: {},
  voteActivite: (id, vote) =>
    set((state) => ({
      userVotes: { ...state.userVotes, [id]: vote },
    })),
}));
