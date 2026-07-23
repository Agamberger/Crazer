import { create } from 'zustand';
import { User } from '@/shared/types';

interface ProfilState {
  currentUser: User;
  updateInterests: (interests: string[]) => void;
}

const mockUser: User = {
  id: 'user-1',
  name: 'Alexandre',
  email: 'alexandre@crazer.app',
  interests: ['Burgers', 'Bowling', 'Concerts', 'Escape Game'],
  friendsCount: 14,
};

export const useProfilStore = create<ProfilState>((set) => ({
  currentUser: mockUser,
  updateInterests: (interests) =>
    set((state) => ({
      currentUser: { ...state.currentUser, interests },
    })),
}));
