import { create } from 'zustand';
import { authService } from '../services/authService';
import { AuthStore, SignInCredentials, SignUpCredentials } from '../types';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (credentials: SignInCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const { session, user } = await authService.signInWithEmail(credentials);
      set({ session, user, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion inconnue.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (credentials: SignUpCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const { session, user } = await authService.signUpWithEmail(credentials);
      set({ session, user, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création du compte.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.signOut();
      set({ user: null, session: null, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la déconnexion.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  initializeAuth: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true, error: null });
    try {
      const { session, user } = await authService.getCurrentSession();
      set({ session, user, isInitialized: true, isLoading: false });

      // Écouter les changements d'état Supabase Auth
      authService.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT' || (!newSession && event !== 'INITIAL_SESSION')) {
          set({ session: null, user: null });
        } else if (newSession?.user) {
          set({
            session: newSession,
            user: {
              id: newSession.user.id,
              email: newSession.user.email || '',
              fullName: newSession.user.user_metadata?.full_name || '',
              avatarUrl: newSession.user.user_metadata?.avatar_url || '',
            },
          });
        }
      });
    } catch (err: unknown) {
      set({ isInitialized: true, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
