import { supabase } from '@/shared/lib/supabase';
import { FriendStatus, UserSearchResult } from '../types';

export const friendsService = {
  /**
   * Rechercher des utilisateurs par nom ou email et déterminer leur statut d'amitié par rapport à l'utilisateur courant.
   */
  async searchUsers(query: string, currentUserId: string): Promise<UserSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    // 1. Récupération des profils correspondant à la recherche (hors utilisateur courant)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .neq('id', currentUserId)
      .or(`full_name.ilike.%${trimmedQuery}%,email.ilike.%${trimmedQuery}%`)
      .limit(20);

    if (profilesError) {
      throw new Error(`Erreur lors de la recherche des utilisateurs : ${profilesError.message}`);
    }

    if (!profilesData || profilesData.length === 0) {
      return [];
    }

    const foundUserIds = profilesData.map((p) => p.id);

    // 2. Récupération des amitiés existantes entre l'utilisateur courant et les profils trouvés
    const { data: friendshipsData, error: friendshipsError } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status')
      .or(`and(user_id.eq.${currentUserId},friend_id.in.(${foundUserIds.join(',')})),and(friend_id.eq.${currentUserId},user_id.in.(${foundUserIds.join(',')}))`);

    if (friendshipsError) {
      throw new Error(`Erreur lors de la récupération des amitiés : ${friendshipsError.message}`);
    }

    const friendshipMap = new Map<
      string,
      { id: string; status: 'pending' | 'accepted' | 'rejected'; isSender: boolean }
    >();

    if (friendshipsData) {
      friendshipsData.forEach((f) => {
        const otherUserId = f.user_id === currentUserId ? f.friend_id : f.user_id;
        friendshipMap.set(otherUserId, {
          id: f.id,
          status: f.status as 'pending' | 'accepted' | 'rejected',
          isSender: f.user_id === currentUserId,
        });
      });
    }

    // 3. Mapping final avec statut réactif
    return profilesData.map((profile) => {
      const friendship = friendshipMap.get(profile.id);
      let friendshipStatus: FriendStatus = 'none';

      if (friendship) {
        if (friendship.status === 'accepted') {
          friendshipStatus = 'accepted';
        } else if (friendship.status === 'pending') {
          friendshipStatus = friendship.isSender ? 'pending_sent' : 'pending_received';
        } else if (friendship.status === 'rejected') {
          friendshipStatus = 'rejected';
        }
      }

      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        friendshipStatus,
        friendshipId: friendship?.id,
      };
    });
  },

  /**
   * Envoyer une demande d'ami à un utilisateur.
   */
  async sendFriendRequest(currentUserId: string, targetUserId: string): Promise<string> {
    const { data, error } = await supabase
      .from('friendships')
      .insert({
        user_id: currentUserId,
        friend_id: targetUserId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Impossible d'envoyer la demande d'ami : ${error.message}`);
    }

    return data.id;
  },

  /**
   * Accepter une demande d'ami reçue.
   */
  async acceptFriendRequest(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friendships')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', friendshipId);

    if (error) {
      throw new Error(`Impossible d'accepter la demande d'ami : ${error.message}`);
    }
  },

  /**
   * Supprimer une amitié ou annuler une demande d'ami.
   */
  async removeFriendship(friendshipId: string): Promise<void> {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);

    if (error) {
      throw new Error(`Impossible de supprimer l'amitié : ${error.message}`);
    }
  },

  /**
   * Récupérer les amis acceptés et demandes reçues en attente pour un utilisateur.
   */
  async getFriendsList(currentUserId: string): Promise<{
    friends: UserSearchResult[];
    pendingRequests: UserSearchResult[];
  }> {
    const { data, error } = await supabase
      .from('friendships')
      .select('id, user_id, friend_id, status, created_at')
      .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

    if (error) {
      throw new Error(`Erreur lors du chargement des amis : ${error.message}`);
    }

    if (!data || data.length === 0) {
      return { friends: [], pendingRequests: [] };
    }

    const otherUserIds = data.map((f) => (f.user_id === currentUserId ? f.friend_id : f.user_id));

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', otherUserIds);

    if (profilesError) {
      throw new Error(`Erreur lors du chargement des profils d'amis : ${profilesError.message}`);
    }

    const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

    const friends: UserSearchResult[] = [];
    const pendingRequests: UserSearchResult[] = [];

    data.forEach((f) => {
      const otherUserId = f.user_id === currentUserId ? f.friend_id : f.user_id;
      const profile = profileMap.get(otherUserId);
      if (!profile) return;

      const userRes: UserSearchResult = {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        friendshipStatus:
          f.status === 'accepted'
            ? 'accepted'
            : f.user_id === currentUserId
            ? 'pending_sent'
            : 'pending_received',
        friendshipId: f.id,
      };

      if (f.status === 'accepted') {
        friends.push(userRes);
      } else if (f.status === 'pending' && f.friend_id === currentUserId) {
        pendingRequests.push(userRes);
      }
    });

    return { friends, pendingRequests };
  },
};
