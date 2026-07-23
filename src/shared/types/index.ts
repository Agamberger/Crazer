/**
 * Types et entités clés du domaine Crazer.
 */

export * from './database.types';

/** Utilisateur Crazer */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  interests: string[];
  friendsCount: number;
}

/** Statut d'une Sortie */
export type SortieStatus = 'draft' | 'voting' | 'planned' | 'completed' | 'cancelled';

/** Sortie : rassemblement d'une ou plusieurs personnes */
export interface Sortie {
  id: string;
  title: string;
  description?: string;
  isPrivate: boolean;
  creatorId: string;
  participantIds: string[];
  status: SortieStatus;
  scheduledDate?: string;
  meetingPoint?: string;
  activityIds: string[];
  itineraryId?: string;
  createdAt: string;
}

/** Activité : quelque chose à faire (proposé par un établissement, etc.) */
export interface Activite {
  id: string;
  title: string;
  description: string;
  category: 'restaurant' | 'bar' | 'cinema' | 'sport' | 'culture' | ' plein_air' | 'autre';
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  estimatedBudget: number; // en euros
  imageUrl?: string;
  rating?: number;
}

/** Événement : activité temporaire et datée */
export interface Evenement extends Activite {
  startDate: string;
  endDate: string;
  organizer: string;
}

/** Itinéraire : suite d'activités/lieux planifiée pour une sortie */
export interface Itineraire {
  id: string;
  sortieId: string;
  title: string;
  steps: {
    order: number;
    activiteId: string;
    plannedTime?: string;
  }[];
}

/** Journal d'aventure : espace de souvenirs lié à une sortie */
export interface JournalAventure {
  id: string;
  sortieId: string;
  title: string;
  photos: string[];
  notes: string[];
  createdAt: string;
}

/** Dépense partagée (type Tricount) */
export interface Depense {
  id: string;
  sortieId: string;
  title: string;
  amount: number;
  payerId: string;
  beneficiaryIds: string[];
  createdAt: string;
}

/** Badge / Achievement */
export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
}
