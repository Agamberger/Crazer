import { friendsService } from '../services/friendsService';
import { supabase } from '@/shared/lib/supabase';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('friendsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('doit retourner une liste vide si la requête est vide', async () => {
      const results = await friendsService.searchUsers('   ', 'user-1');
      expect(results).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('doit rechercher des utilisateurs et inclure les statuts d amitié', async () => {
      const mockProfiles = [
        { id: 'user-2', email: 'alice@crazer.app', full_name: 'Alice Dupuis', avatar_url: null },
        { id: 'user-3', email: 'bob@crazer.app', full_name: 'Bob Martin', avatar_url: null },
      ];

      const mockFriendships = [
        { id: 'f-1', user_id: 'user-1', friend_id: 'user-2', status: 'pending' },
      ];

      const profilesChain = {
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockProfiles, error: null }),
      };

      const friendshipsChain = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockFriendships, error: null }),
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') return profilesChain;
        if (table === 'friendships') return friendshipsChain;
        return {};
      });

      const results = await friendsService.searchUsers('alice', 'user-1');

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
        email: 'bob@crazer.app',
        fullName: 'Bob Martin',
        avatarUrl: null,
        friendshipStatus: 'none',
        friendshipId: undefined,
      });
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
