import { create } from 'zustand';
import { Itineraire } from '@/shared/types';

interface ItineraireState {
  itineraires: Itineraire[];
}

export const useItineraireStore = create<ItineraireState>(() => ({
  itineraires: [],
}));
