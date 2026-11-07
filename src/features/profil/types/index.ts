export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected';

export interface UserSearchResult {
  id: string;
  /** Masqué (`null`) sauf pour un ami, l'auteur d'une demande reçue, ou un email saisi exactement. */
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  friendshipStatus: FriendStatus;
  friendshipId?: string;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface ProfilUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  interests: string[];
  friendsCount: number;
}
