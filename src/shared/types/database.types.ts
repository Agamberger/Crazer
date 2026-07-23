/**
 * Types TypeScript générés/définis pour la base de données Supabase de Crazer.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          interests: string[];
          friends_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          interests?: string[];
          friends_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          interests?: string[];
          friends_count?: number;
          created_at?: string;
        };
      };
      sorties: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          is_private: boolean;
          creator_id: string;
          participant_ids: string[];
          status: 'draft' | 'voting' | 'planned' | 'completed' | 'cancelled';
          scheduled_date: string | null;
          meeting_point: string | null;
          activity_ids: string[];
          itinerary_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          is_private?: boolean;
          creator_id: string;
          participant_ids?: string[];
          status?: 'draft' | 'voting' | 'planned' | 'completed' | 'cancelled';
          scheduled_date?: string | null;
          meeting_point?: string | null;
          activity_ids?: string[];
          itinerary_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          is_private?: boolean;
          creator_id?: string;
          participant_ids?: string[];
          status?: 'draft' | 'voting' | 'planned' | 'completed' | 'cancelled';
          scheduled_date?: string | null;
          meeting_point?: string | null;
          activity_ids?: string[];
          itinerary_id?: string | null;
          created_at?: string;
        };
      };
      activites: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: 'restaurant' | 'bar' | 'cinema' | 'sport' | 'culture' | 'plein_air' | 'autre';
          address: string;
          latitude: number;
          longitude: number;
          estimated_budget: number;
          image_url: string | null;
          rating: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          category: 'restaurant' | 'bar' | 'cinema' | 'sport' | 'culture' | 'plein_air' | 'autre';
          address: string;
          latitude: number;
          longitude: number;
          estimated_budget?: number;
          image_url?: string | null;
          rating?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          category?: 'restaurant' | 'bar' | 'cinema' | 'sport' | 'culture' | 'plein_air' | 'autre';
          address?: string;
          latitude?: number;
          longitude?: number;
          estimated_budget?: number;
          image_url?: string | null;
          rating?: number | null;
          created_at?: string;
        };
      };
      depenses: {
        Row: {
          id: string;
          sortie_id: string;
          title: string;
          amount: number;
          payer_id: string;
          beneficiary_ids: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          sortie_id: string;
          title: string;
          amount: number;
          payer_id: string;
          beneficiary_ids?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          sortie_id?: string;
          title?: string;
          amount?: number;
          payer_id?: string;
          beneficiary_ids?: string[];
          created_at?: string;
        };
      };
      journal_aventures: {
        Row: {
          id: string;
          sortie_id: string;
          title: string;
          photos: string[];
          notes: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          sortie_id: string;
          title: string;
          photos?: string[];
          notes?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          sortie_id?: string;
          title?: string;
          photos?: string[];
          notes?: string[];
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      sortie_status: 'draft' | 'voting' | 'planned' | 'completed' | 'cancelled';
      activite_category:
        'restaurant' | 'bar' | 'cinema' | 'sport' | 'culture' | 'plein_air' | 'autre';
    };
  };
}
