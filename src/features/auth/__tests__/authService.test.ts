import { authService } from '../services/authService';
import { supabase } from '@/shared/lib/supabase';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithEmail', () => {
    it('doit se connecter avec succès et retourner l utilisateur et la session', async () => {
      const mockSession = {
        access_token: 'fake-token',
        user: {
          id: 'user-123',
          email: 'test@crazer.app',
          user_metadata: { full_name: 'Test User' },
        },
      };

      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSession,
          user: mockSession.user,
        },
        error: null,
      });

      const result = await authService.signInWithEmail({
        email: 'test@crazer.app',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@crazer.app',
        password: 'password123',
      });

      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@crazer.app',
        fullName: 'Test User',
        avatarUrl: '',
      });
    });

    it('doit lever une erreur si la connexion Supabase échoue', async () => {
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Identifiants invalides' },
      });

      await expect(
        authService.signInWithEmail({
          email: 'test@crazer.app',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow('Identifiants invalides');
    });
  });

  describe('signUpWithEmail', () => {
    it('doit créer un compte avec succès', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'new@crazer.app',
        user_metadata: { full_name: 'Nouveau User' },
      };

      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: {
          session: null,
          user: mockUser,
        },
        error: null,
      });

      const result = await authService.signUpWithEmail({
        email: 'new@crazer.app',
        password: 'password123',
        fullName: 'Nouveau User',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@crazer.app',
        password: 'password123',
        options: {
          data: {
            full_name: 'Nouveau User',
          },
        },
      });

      expect(result.user).toEqual({
        id: 'user-456',
        email: 'new@crazer.app',
        fullName: 'Nouveau User',
        avatarUrl: '',
      });
    });

    it('doit lever une erreur si l inscription échoue', async () => {
      (supabase.auth.signUp as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Cet email est déjà utilisé' },
      });

      await expect(
        authService.signUpWithEmail({
          email: 'existing@crazer.app',
          password: 'password123',
        }),
      ).rejects.toThrow('Cet email est déjà utilisé');
    });
  });

  describe('signOut', () => {
    it('doit déconnecter l utilisateur sans erreur', async () => {
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await authService.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
