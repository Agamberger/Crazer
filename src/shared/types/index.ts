/**
 * Types et entités clés du domaine Crazer.
 */

export * from './database.types';
export * from './place';

import { Database, Enums } from './database.types';

/** Utilisateur Crazer */
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  interests: string[];
  friendsCount: number;
}

/** Types Supabase pour Outings dérivés directement du schéma PostgreSQL / Supabase */
export type OutingRow = Database['public']['Tables']['outings']['Row'];
export type OutingInsert = Database['public']['Tables']['outings']['Insert'];
export type OutingUpdate = Database['public']['Tables']['outings']['Update'];

/** Type de statut extrait directement des Enums de la base de données Supabase */
export type OutingStatus = Enums<'outing_status'>;

/** Configuration UI (libellés & émojis) strictement typée sur l'enum de la base de données */
export const OUTING_STATUS_CONFIG: Record<
  OutingStatus,
  { label: string; emoji: string }
> = {
  draft: { label: 'Brouillon', emoji: '📝' },
  planned: { label: 'Planifiée', emoji: '📅' },
  ongoing: { label: 'En cours', emoji: '⚡' },
  done: { label: 'Terminée', emoji: '✅' },
  cancelled: { label: 'Annulée', emoji: '❌' },
};

/** Types Supabase pour Planned Outings dérivés directement du schéma PostgreSQL / Supabase */
export type PlannedOutingRow = Database['public']['Tables']['planned_outings']['Row'];
export type PlannedOutingInsert = Database['public']['Tables']['planned_outings']['Insert'];
export type PlannedOutingUpdate = Database['public']['Tables']['planned_outings']['Update'];

/** Type de statut de planned_outing extrait directement des Enums de la base de données */
export type PlannedOutingStatus = Enums<'planned_outing_status'>;

/** Configuration UI (libellés & émojis) pour Planned Outings */
export const PLANNED_OUTING_STATUS_CONFIG: Record<
  PlannedOutingStatus,
  { label: string; emoji: string }
> = {
  pending: { label: 'En attente', emoji: '⏳' },
  confirmed: { label: 'Confirmée', emoji: '✅' },
  skipped: { label: 'Passée', emoji: '⏭️' },
  cancelled: { label: 'Annulée', emoji: '❌' },
};

/** Outing participants, candidate days and availabilities (scheduling workflow) */
export type OutingParticipantRow = Database['public']['Tables']['outing_participants']['Row'];
export type ParticipantStatus = Enums<'participant_status'>;
export type OutingDayRow = Database['public']['Tables']['outing_days']['Row'];
export type OutingAvailabilityRow = Database['public']['Tables']['outing_availabilities']['Row'];

/** Outing type and guided answers (step 4 of the outing journey) */
export type OutingType = Enums<'outing_type'>;
export type OutingActivityType = Enums<'outing_activity_type'>;
export type OutingBudget = Enums<'outing_budget'>;
export type OutingAnswerRow = Database['public']['Tables']['outing_answers']['Row'];

/** Configuration UI (libellés & émojis) pour le statut d'un participant */
export const PARTICIPANT_STATUS_CONFIG: Record<
  ParticipantStatus,
  { label: string; emoji: string }
> = {
  invited: { label: 'En attente', emoji: '✉️' },
  accepted: { label: 'Vient', emoji: '✅' },
  maybe: { label: 'Peut-être', emoji: '🤔' },
  declined: { label: 'Ne vient pas', emoji: '❌' },
};

/** Alias rétro-compatible */
export type SortieRow = OutingRow;
export type Sortie = OutingRow;


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

/** Activity proposals and votes (step 5 of the outing journey) */
export type ActivityVote = Enums<'activity_vote'>;
export type OutingActivityRow = Database['public']['Tables']['outing_activities']['Row'];
export type OutingActivityVoteRow = Database['public']['Tables']['outing_activity_votes']['Row'];
