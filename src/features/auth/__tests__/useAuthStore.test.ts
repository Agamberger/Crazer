import { act } from '@testing-library/react-native';
import { Session } from '@supabase/supabase-js';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';

jest.mock('../services/authService', () => ({
  authService: {
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signOut: jest.fn(),
    getCurrentSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  });

  it('doit avoir un état initial correct', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });

  it('doit gérer la connexion avec succès', async () => {
    const mockUser = { id: '1', email: 'test@crazer.app', fullName: 'Test' };
    const mockSession = { access_token: 'token', refresh_token: 'refresh' } as unknown as Session;

    (authService.signInWithEmail as jest.Mock).mockResolvedValue({
      user: mockUser,
      session: mockSession,
    });

    await act(async () => {
      await useAuthStore.getState().login({ email: 'test@crazer.app', password: 'password123' });
    });

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.session).toEqual(mockSession);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('doit capturer les erreurs de connexion', async () => {
    (authService.signInWithEmail as jest.Mock).mockRejectedValue(new Error('Mot de passe incorrect'));

    await act(async () => {
      try {
        await useAuthStore.getState().login({ email: 'test@crazer.app', password: 'wrong' });
      } catch {
        // Ignoré car l'erreur est réémise par le store
      }
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Mot de passe incorrect');
  });

  it('doit gérer la déconnexion', async () => {
    const mockSession = { access_token: 'token' } as unknown as Session;

    useAuthStore.setState({
      user: { id: '1', email: 'test@crazer.app' },
      session: mockSession,
    });

    (authService.signOut as jest.Mock).mockResolvedValue(undefined);

    await act(async () => {
      await useAuthStore.getState().logout();
    });

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
