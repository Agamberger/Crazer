import { friendsService } from '../services/friendsService';
import { supabase } from '@/shared/lib/supabase';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe('friendsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('doit retourner une liste vide si la requête est vide ou trop courte', async () => {
      expect(await friendsService.searchUsers('   ', 'user-1')).toEqual([]);
      expect(await friendsService.searchUsers(' a ', 'user-1')).toEqual([]);
      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('doit rechercher via la RPC search_profiles et inclure les statuts d amitié', async () => {
      const mockProfiles = [
        { id: 'user-2', email: 'alice@crazer.app', full_name: 'Alice Dupuis', avatar_url: null },
        { id: 'user-3', email: null, full_name: 'Bob Martin', avatar_url: null },
      ];

      const mockFriendships = [
        { id: 'f-1', user_id: 'user-1', friend_id: 'user-2', status: 'pending' },
      ];

      (supabase.rpc as jest.Mock).mockResolvedValue({ data: mockProfiles, error: null });

      const friendshipsChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockFriendships, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(friendshipsChain);

      const results = await friendsService.searchUsers('  alice, id.eq.x ', 'user-1');

      // La saisie brute est transmise en paramètre de RPC, jamais interpolée dans un filtre PostgREST
      expect(supabase.rpc).toHaveBeenCalledWith('search_profiles', {
        p_query: 'alice, id.eq.x',
      });
      expect(supabase.from).toHaveBeenCalledWith('friendships');
      expect(supabase.from).not.toHaveBeenCalledWith('profiles');

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'user-2',
        email: 'alice@crazer.app',
        fullName: 'Alice Dupuis',
        avatarUrl: null,
        friendshipStatus: 'pending_sent',
        friendshipId: 'f-1',
      });
      expect(results[1]).toEqual({
        id: 'user-3',
        email: null,
        fullName: 'Bob Martin',
        avatarUrl: null,
        friendshipStatus: 'none',
        friendshipId: undefined,
      });
    });

    it('doit lever une erreur si la RPC échoue', async () => {
      (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: { message: 'boom' } });

      await expect(friendsService.searchUsers('alice', 'user-1')).rejects.toThrow(
        'Erreur lors de la recherche des utilisateurs : boom',
      );
    });
  });

  describe('getFriendsList', () => {
    it('doit charger les profils via la RPC get_profiles', async () => {
      const friendshipsChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({
          data: [
            { id: 'f-1', user_id: 'user-1', friend_id: 'user-2', status: 'accepted' },
            { id: 'f-2', user_id: 'user-3', friend_id: 'user-1', status: 'pending' },
          ],
          error: null,
        }),
      };
      (supabase.from as jest.Mock).mockReturnValue(friendshipsChain);
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [
          { id: 'user-2', email: 'bob@crazer.app', full_name: 'Bob', avatar_url: null },
          { id: 'user-3', email: 'charlie@crazer.app', full_name: 'Charlie', avatar_url: null },
        ],
        error: null,
      });

      const { friends, pendingRequests } = await friendsService.getFriendsList('user-1');

      expect(supabase.rpc).toHaveBeenCalledWith('get_profiles', { p_ids: ['user-2', 'user-3'] });
      expect(friends.map((f) => f.id)).toEqual(['user-2']);
      expect(pendingRequests.map((f) => f.id)).toEqual(['user-3']);
      expect(pendingRequests[0].friendshipStatus).toBe('pending_received');
    });
  });

  describe('sendFriendRequest', () => {
    it('doit insérer une demande d ami et retourner l id créé', async () => {
      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'friendship-99' }, error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      const id = await friendsService.sendFriendRequest('user-1', 'user-2');

      expect(supabase.from).toHaveBeenCalledWith('friendships');
      expect(chain.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        friend_id: 'user-2',
        status: 'pending',
      });
      expect(id).toBe('friendship-99');
    });

    it('doit lever une erreur si la création échoue', async () => {
      const chain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Erreur SQL' } }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await expect(friendsService.sendFriendRequest('user-1', 'user-2')).rejects.toThrow(
        'Impossible d\'envoyer la demande d\'ami : Erreur SQL'
      );
    });
  });

  describe('acceptFriendRequest', () => {
    it('doit mettre à jour le statut à accepted', async () => {
      const chain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await friendsService.acceptFriendRequest('friendship-10');

      expect(supabase.from).toHaveBeenCalledWith('friendships');
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'accepted' })
      );
      expect(chain.eq).toHaveBeenCalledWith('id', 'friendship-10');
    });
  });

  describe('removeFriendship', () => {
    it('doit supprimer la ligne d amitié', async () => {
      const chain = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as jest.Mock).mockReturnValue(chain);

      await friendsService.removeFriendship('friendship-10');

      expect(supabase.from).toHaveBeenCalledWith('friendships');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'friendship-10');
    });
  });
});
