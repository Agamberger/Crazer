import { create } from 'zustand';
import { Badge } from '@/shared/types';

interface GamificationState {
  badges: Badge[];
}

const mockBadges: Badge[] = [
  {
    id: 'b-1',
    title: 'Premier Pas',
    description: 'A rejoint sa première sortie Crazer !',
    iconName: 'star',
    unlockedAt: '2026-07-20T10:00:00Z',
  },
  {
    id: 'b-2',
    title: 'Chef d’Orchestre',
    description: 'A créé sa première sortie de groupe.',
    iconName: 'compass',
  },
];

export const useGamificationStore = create<GamificationState>(() => ({
  badges: mockBadges,
}));
